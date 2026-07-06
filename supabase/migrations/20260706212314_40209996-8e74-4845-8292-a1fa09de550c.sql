
-- 1. Remove old admin_add_transaction overload (without _fee_waived)
DROP FUNCTION IF EXISTS public.admin_add_transaction(
  _user_id uuid, _type tx_type, _currency_id uuid, _amount numeric, _status text,
  _tx_hash text, _sender_address text, _note text, _hidden boolean, _tx_date timestamp with time zone
);

-- 2. Tiered cashback in staff_process_swap
CREATE OR REPLACE FUNCTION public.staff_process_swap(_tx_id uuid, _approve boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tx RECORD; to_curr uuid; to_amount numeric; from_amount numeric;
  cashback_rate numeric; cashback_usd numeric; usdt_id uuid; cashback_amt numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO tx FROM public.transactions WHERE id = _tx_id AND type = 'swap' AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF public.has_role(auth.uid(),'agent') AND NOT public.is_my_client(tx.user_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  to_curr := (tx.metadata->>'to_currency')::uuid;
  to_amount := (tx.metadata->>'to_amount')::numeric;
  from_amount := (tx.metadata->>'from_amount')::numeric;

  IF _approve THEN
    UPDATE public.wallets SET locked = locked - from_amount
     WHERE user_id = tx.user_id AND currency_id = tx.currency_id;

    INSERT INTO public.wallets (user_id, currency_id, available)
    VALUES (tx.user_id, to_curr, to_amount)
    ON CONFLICT (user_id, currency_id) DO UPDATE SET available = public.wallets.available + to_amount;

    -- Tiered cashback based on USD value of purchase
    cashback_rate := CASE
      WHEN COALESCE(tx.usd_value,0) <= 10000 THEN 0.01
      WHEN COALESCE(tx.usd_value,0) <= 50000 THEN 0.03
      ELSE 0.05
    END;
    cashback_usd := COALESCE(tx.usd_value,0) * cashback_rate;

    SELECT id INTO usdt_id FROM public.currencies WHERE upper(symbol) = 'USDT' LIMIT 1;
    IF usdt_id IS NOT NULL AND cashback_usd > 0 THEN
      cashback_amt := cashback_usd;
      INSERT INTO public.wallets (user_id, currency_id, available)
      VALUES (tx.user_id, usdt_id, cashback_amt)
      ON CONFLICT (user_id, currency_id) DO UPDATE SET available = public.wallets.available + cashback_amt;
      INSERT INTO public.transactions (user_id, currency_id, type, status, amount, usd_value, cashback_amount, metadata)
      VALUES (tx.user_id, usdt_id, 'adjustment', 'completed', cashback_amt, cashback_amt, cashback_amt,
        jsonb_build_object('kind','cashback','source_tx', _tx_id, 'rate', cashback_rate));
    END IF;

    UPDATE public.transactions
       SET status = 'completed', cashback_amount = COALESCE(cashback_usd,0),
           metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('approved_by', auth.uid(), 'cashback_rate', cashback_rate)
     WHERE id = _tx_id;

    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (tx.user_id,'buy_approved','Compra aprovada','Sua compra foi aprovada.');
  ELSE
    UPDATE public.wallets
       SET locked = locked - from_amount,
           available = available + from_amount
     WHERE user_id = tx.user_id AND currency_id = tx.currency_id;

    UPDATE public.transactions SET status = 'rejected',
           metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('rejected_by', auth.uid())
     WHERE id = _tx_id;

    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (tx.user_id,'buy_rejected','Compra rejeitada','Sua compra foi rejeitada e o saldo foi devolvido.');
  END IF;

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), CASE WHEN _approve THEN 'approve_swap' ELSE 'reject_swap' END, 'transaction', _tx_id::text,
    jsonb_build_object('user_id', tx.user_id, 'amount', from_amount));
END; $function$;

-- 3. Extra agent permission columns
ALTER TABLE public.agent_permissions
  ADD COLUMN IF NOT EXISTS can_approve_kyc boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_process_tx boolean NOT NULL DEFAULT false;

-- 4. Realtime on wallets so client sees updates immediately
ALTER TABLE public.wallets REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'wallets'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets';
  END IF;
END $$;
