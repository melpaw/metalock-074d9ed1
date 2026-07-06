CREATE OR REPLACE FUNCTION public.admin_add_transaction(
  _user_id uuid,
  _type public.tx_type,
  _currency_id uuid,
  _amount numeric,
  _status text,
  _tx_hash text,
  _sender_address text,
  _note text,
  _hidden boolean,
  _tx_date timestamptz,
  _fee_waived boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  enum_status := CASE lower(_status)
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
  signed := CASE WHEN _type IN ('withdrawal','investment') THEN -abs(_amount) ELSE abs(_amount) END;

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
      'ui_status', lower(_status),
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
      UPDATE public.wallets
         SET available = available - abs(_amount)
       WHERE user_id = _user_id AND currency_id = _currency_id;
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (_user_id, 'transaction_created', 'Nova transação: ' || _type, 'Valor: ' || abs(_amount)::text || ' — Status: ' || lower(_status));

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(),'admin_add_transaction','transaction', new_id::text,
    jsonb_build_object('user_id', _user_id, 'amount', _amount, 'type', _type, 'status', _status, 'fee', tx_fee, 'fee_waived', COALESCE(_fee_waived, false)));

  RETURN new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_add_transaction(uuid, public.tx_type, uuid, numeric, text, text, text, text, boolean, timestamptz, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_transaction(uuid, public.tx_type, uuid, numeric, text, text, text, text, boolean, timestamptz, boolean) TO authenticated;