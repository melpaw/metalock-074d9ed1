CREATE OR REPLACE FUNCTION public.admin_add_transaction(
  _user_id uuid,
  _type tx_type,
  _currency_id uuid,
  _amount numeric,
  _status text,
  _tx_hash text,
  _sender_address text,
  _note text,
  _hidden boolean,
  _tx_date timestamp with time zone,
  _fee_waived boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid;
  price numeric;
  usd numeric;
  enum_status public.tx_status;
  signed numeric;
  tx_fee numeric;
  net_amount numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _amount IS NULL OR _amount = 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  enum_status := CASE lower(COALESCE(_status, 'pending'))
    WHEN 'approved' THEN 'completed'::public.tx_status
    WHEN 'completed' THEN 'completed'::public.tx_status
    WHEN 'rejected' THEN 'rejected'::public.tx_status
    WHEN 'cancelled' THEN 'cancelled'::public.tx_status
    WHEN 'canceled' THEN 'cancelled'::public.tx_status
    ELSE 'pending'::public.tx_status
  END;

  SELECT usd_price INTO price FROM public.currencies WHERE id = _currency_id;
  usd := COALESCE(price, 0) * abs(_amount);
  tx_fee := CASE WHEN _type = 'deposit' AND NOT COALESCE(_fee_waived, false) THEN round(abs(_amount) * 0.03, 10) ELSE 0 END;
  net_amount := GREATEST(abs(_amount) - tx_fee, 0);

  signed := CASE
    WHEN _type IN ('withdrawal','investment') THEN -abs(_amount)
    WHEN _type = 'adjustment' THEN _amount
    ELSE abs(_amount)
  END;

  INSERT INTO public.transactions (user_id, currency_id, type, status, amount, fee, usd_value, note, hidden, created_by, created_at, reference, metadata)
  VALUES (
    _user_id,
    _currency_id,
    _type,
    enum_status,
    signed,
    tx_fee,
    usd,
    _note,
    COALESCE(_hidden,false),
    auth.uid(),
    COALESCE(_tx_date, now()),
    _tx_hash,
    jsonb_build_object(
      'tx_hash', _tx_hash,
      'sender_address', _sender_address,
      'ui_status', lower(COALESCE(_status, 'pending')),
      'created_by_admin', true,
      'fee_rate', CASE WHEN _type = 'deposit' AND NOT COALESCE(_fee_waived, false) THEN 0.03 ELSE 0 END,
      'fee_waived', COALESCE(_fee_waived, false),
      'net_amount', CASE WHEN _type = 'deposit' THEN net_amount ELSE abs(_amount) END
    )
  )
  RETURNING id INTO new_id;

  IF enum_status = 'completed' THEN
    IF _type = 'deposit' THEN
      INSERT INTO public.wallets (user_id, currency_id, available)
      VALUES (_user_id, _currency_id, net_amount)
      ON CONFLICT (user_id, currency_id) DO UPDATE
        SET available = public.wallets.available + net_amount;
    ELSIF _type = 'withdrawal' THEN
      INSERT INTO public.wallets (user_id, currency_id, available)
      VALUES (_user_id, _currency_id, -abs(_amount))
      ON CONFLICT (user_id, currency_id) DO UPDATE
        SET available = public.wallets.available - abs(_amount);
    ELSIF _type = 'adjustment' THEN
      INSERT INTO public.wallets (user_id, currency_id, available)
      VALUES (_user_id, _currency_id, _amount)
      ON CONFLICT (user_id, currency_id) DO UPDATE
        SET available = public.wallets.available + _amount;
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (_user_id, 'transaction_created', 'Nova transação: ' || _type, 'Valor: ' || abs(_amount)::text || ' — Status: ' || lower(COALESCE(_status, 'pending')));

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(),'admin_add_transaction','transaction', new_id::text,
    jsonb_build_object('user_id', _user_id, 'amount', _amount, 'type', _type, 'status', _status, 'fee', tx_fee, 'fee_waived', COALESCE(_fee_waived, false)));

  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_transaction(
  _tx_id uuid,
  _status text,
  _note text,
  _hidden boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tx RECORD;
  enum_status public.tx_status;
  old_status public.tx_status;
  wallet_delta numeric := 0;
  tx_abs numeric;
  deposit_net numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO tx FROM public.transactions WHERE id = _tx_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;

  old_status := tx.status;
  tx_abs := abs(tx.amount);
  deposit_net := GREATEST(tx_abs - COALESCE(tx.fee, 0), 0);

  enum_status := CASE lower(COALESCE(_status, tx.status::text))
    WHEN 'approved' THEN 'completed'::public.tx_status
    WHEN 'completed' THEN 'completed'::public.tx_status
    WHEN 'rejected' THEN 'rejected'::public.tx_status
    WHEN 'cancelled' THEN 'cancelled'::public.tx_status
    WHEN 'canceled' THEN 'cancelled'::public.tx_status
    ELSE 'pending'::public.tx_status
  END;

  IF old_status IS DISTINCT FROM enum_status THEN
    IF tx.type = 'deposit' THEN
      IF old_status <> 'completed' AND enum_status = 'completed' THEN
        wallet_delta := deposit_net;
      ELSIF old_status = 'completed' AND enum_status <> 'completed' THEN
        wallet_delta := -deposit_net;
      END IF;

      IF wallet_delta <> 0 THEN
        INSERT INTO public.wallets (user_id, currency_id, available)
        VALUES (tx.user_id, tx.currency_id, wallet_delta)
        ON CONFLICT (user_id, currency_id) DO UPDATE
          SET available = public.wallets.available + wallet_delta;
      END IF;

    ELSIF tx.type = 'withdrawal' THEN
      IF old_status = 'pending' AND enum_status = 'completed' THEN
        UPDATE public.wallets
           SET locked = GREATEST(locked - tx_abs, 0)
         WHERE user_id = tx.user_id AND currency_id = tx.currency_id;
      ELSIF old_status = 'pending' AND enum_status IN ('rejected','cancelled') THEN
        UPDATE public.wallets
           SET locked = GREATEST(locked - tx_abs, 0),
               available = available + tx_abs
         WHERE user_id = tx.user_id AND currency_id = tx.currency_id;
        wallet_delta := tx_abs;
      ELSIF old_status = 'completed' AND enum_status IN ('rejected','cancelled','pending') THEN
        INSERT INTO public.wallets (user_id, currency_id, available)
        VALUES (tx.user_id, tx.currency_id, tx_abs)
        ON CONFLICT (user_id, currency_id) DO UPDATE
          SET available = public.wallets.available + tx_abs;
        wallet_delta := tx_abs;
      ELSIF old_status IN ('rejected','cancelled') AND enum_status = 'completed' THEN
        INSERT INTO public.wallets (user_id, currency_id, available)
        VALUES (tx.user_id, tx.currency_id, -tx_abs)
        ON CONFLICT (user_id, currency_id) DO UPDATE
          SET available = public.wallets.available - tx_abs;
        wallet_delta := -tx_abs;
      END IF;

    ELSIF tx.type = 'adjustment' THEN
      IF old_status <> 'completed' AND enum_status = 'completed' THEN
        wallet_delta := tx.amount;
      ELSIF old_status = 'completed' AND enum_status <> 'completed' THEN
        wallet_delta := -tx.amount;
      END IF;

      IF wallet_delta <> 0 THEN
        INSERT INTO public.wallets (user_id, currency_id, available)
        VALUES (tx.user_id, tx.currency_id, wallet_delta)
        ON CONFLICT (user_id, currency_id) DO UPDATE
          SET available = public.wallets.available + wallet_delta;
      END IF;
    END IF;
  END IF;

  UPDATE public.transactions
     SET status = enum_status,
         note = COALESCE(_note, note),
         hidden = COALESCE(_hidden, hidden),
         metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('ui_status', lower(COALESCE(_status, enum_status::text)))
   WHERE id = _tx_id;

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(),'update_tx','transaction', _tx_id::text,
    jsonb_build_object('from', old_status, 'to', enum_status, 'wallet_delta', wallet_delta));
END;
$function$;