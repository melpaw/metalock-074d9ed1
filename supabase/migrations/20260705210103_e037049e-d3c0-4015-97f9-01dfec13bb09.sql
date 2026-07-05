
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usd_value numeric,
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agent_display_name text;

CREATE OR REPLACE FUNCTION public.admin_add_transaction(
  _user_id uuid, _type public.tx_type, _currency_id uuid, _amount numeric,
  _status text, _tx_hash text, _sender_address text, _note text,
  _hidden boolean, _tx_date timestamptz
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; price numeric; usd numeric; enum_status public.tx_status; signed numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  enum_status := CASE lower(_status)
    WHEN 'approved' THEN 'completed'::public.tx_status
    WHEN 'completed' THEN 'completed'::public.tx_status
    WHEN 'rejected' THEN 'rejected'::public.tx_status
    WHEN 'cancelled' THEN 'cancelled'::public.tx_status
    ELSE 'pending'::public.tx_status
  END;
  SELECT usd_price INTO price FROM public.currencies WHERE id = _currency_id;
  usd := COALESCE(price, 0) * abs(_amount);
  signed := CASE WHEN _type IN ('withdrawal','investment') THEN -abs(_amount) ELSE abs(_amount) END;
  INSERT INTO public.transactions (user_id, currency_id, type, status, amount, usd_value, note, hidden, created_by, created_at, reference, metadata)
  VALUES (_user_id, _currency_id, _type, enum_status, signed, usd, _note, COALESCE(_hidden,false), auth.uid(),
    COALESCE(_tx_date, now()), _tx_hash,
    jsonb_build_object('tx_hash', _tx_hash, 'sender_address', _sender_address, 'ui_status', lower(_status), 'created_by_admin', true))
  RETURNING id INTO new_id;
  IF enum_status = 'completed' THEN
    IF _type = 'deposit' THEN
      INSERT INTO public.wallets (user_id, currency_id, available) VALUES (_user_id, _currency_id, abs(_amount))
      ON CONFLICT (user_id, currency_id) DO UPDATE SET available = public.wallets.available + abs(_amount);
    ELSIF _type = 'withdrawal' THEN
      UPDATE public.wallets SET available = available - abs(_amount) WHERE user_id = _user_id AND currency_id = _currency_id;
    END IF;
  END IF;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (_user_id, 'transaction_created',
    'Nova transação: ' || _type,
    'Valor: ' || abs(_amount)::text || ' — Status: ' || lower(_status));
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(),'admin_add_transaction','transaction', new_id::text,
    jsonb_build_object('user_id', _user_id, 'amount', _amount, 'type', _type, 'status', _status));
  RETURN new_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_add_transaction(uuid, public.tx_type, uuid, numeric, text, text, text, text, boolean, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_transaction(uuid, public.tx_type, uuid, numeric, text, text, text, text, boolean, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_transaction(_tx_id uuid, _status text, _note text, _hidden boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tx RECORD; enum_status public.tx_status; old_status public.tx_status;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO tx FROM public.transactions WHERE id = _tx_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  old_status := tx.status;
  enum_status := CASE lower(_status)
    WHEN 'approved' THEN 'completed'::public.tx_status
    WHEN 'completed' THEN 'completed'::public.tx_status
    WHEN 'rejected' THEN 'rejected'::public.tx_status
    WHEN 'cancelled' THEN 'cancelled'::public.tx_status
    ELSE 'pending'::public.tx_status
  END;
  IF enum_status = 'completed' AND old_status <> 'completed' THEN
    IF tx.type = 'deposit' THEN
      INSERT INTO public.wallets (user_id, currency_id, available) VALUES (tx.user_id, tx.currency_id, abs(tx.amount))
      ON CONFLICT (user_id, currency_id) DO UPDATE SET available = public.wallets.available + abs(tx.amount);
    ELSIF tx.type = 'withdrawal' THEN
      UPDATE public.wallets SET available = available - abs(tx.amount) WHERE user_id = tx.user_id AND currency_id = tx.currency_id;
    END IF;
  END IF;
  UPDATE public.transactions
    SET status = enum_status,
        note = COALESCE(_note, note),
        hidden = COALESCE(_hidden, hidden),
        metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('ui_status', lower(_status))
    WHERE id = _tx_id;
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(),'update_tx','transaction', _tx_id::text, jsonb_build_object('from', old_status, 'to', enum_status));
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_update_transaction(uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_transaction(uuid, text, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_agent_display_name(_display_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.profiles SET agent_display_name = _display_name WHERE id = auth.uid();
END; $$;

REVOKE EXECUTE ON FUNCTION public.set_agent_display_name(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_agent_display_name(text) TO authenticated;

-- Policy: clients see all their transactions except hidden ones; admin/agent see all
DROP POLICY IF EXISTS "Users read own transactions" ON public.transactions;
CREATE POLICY "Users read own transactions" ON public.transactions
FOR SELECT TO authenticated
USING (
  (user_id = auth.uid() AND hidden = false)
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'agent')
);
