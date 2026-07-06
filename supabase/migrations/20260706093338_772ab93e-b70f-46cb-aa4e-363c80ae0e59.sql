CREATE OR REPLACE FUNCTION public.admin_update_transaction(_tx_id uuid, _status text, _note text, _hidden boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx RECORD;
  enum_status public.tx_status;
  old_status public.tx_status;
  credit_amount numeric;
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
    WHEN 'canceled' THEN 'cancelled'::public.tx_status
    ELSE 'pending'::public.tx_status
  END;

  IF enum_status = 'completed' AND old_status <> 'completed' THEN
    IF tx.type = 'deposit' THEN
      credit_amount := GREATEST(abs(tx.amount) - COALESCE(tx.fee, 0), 0);
      INSERT INTO public.wallets (user_id, currency_id, available)
      VALUES (tx.user_id, tx.currency_id, credit_amount)
      ON CONFLICT (user_id, currency_id) DO UPDATE
        SET available = public.wallets.available + credit_amount;
    ELSIF tx.type = 'withdrawal' THEN
      UPDATE public.wallets
         SET available = available - abs(tx.amount)
       WHERE user_id = tx.user_id AND currency_id = tx.currency_id;
    END IF;
  END IF;

  UPDATE public.transactions
     SET status = enum_status,
         note = COALESCE(_note, note),
         hidden = COALESCE(_hidden, hidden),
         metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('ui_status', lower(_status))
   WHERE id = _tx_id;

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(),'update_tx','transaction', _tx_id::text,
    jsonb_build_object('from', old_status, 'to', enum_status, 'credited', credit_amount));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_transaction(uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_transaction(uuid, text, text, boolean) TO authenticated;