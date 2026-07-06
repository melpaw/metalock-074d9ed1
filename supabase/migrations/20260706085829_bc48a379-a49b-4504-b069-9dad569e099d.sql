
-- 1. profiles.registered_by
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. transactions.cashback_amount
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cashback_amount numeric(28,10) NOT NULL DEFAULT 0;

-- 3. agent_permissions
CREATE TABLE IF NOT EXISTS public.agent_permissions (
  agent_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  can_add_wallets boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_permissions TO authenticated;
GRANT ALL ON public.agent_permissions TO service_role;
ALTER TABLE public.agent_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_permissions_read" ON public.agent_permissions FOR SELECT TO authenticated
  USING (auth.uid() = agent_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "agent_permissions_admin_write" ON public.agent_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4. helper: is_my_client
CREATE OR REPLACE FUNCTION public.is_my_client(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND registered_by = auth.uid());
$$;

-- 5. Update agent-scoped policies
DROP POLICY IF EXISTS "Agents view profiles" ON public.profiles;
CREATE POLICY "Agents view own clients profile" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'agent') AND registered_by = auth.uid());

DROP POLICY IF EXISTS "Agents view transactions" ON public.transactions;
CREATE POLICY "Agents view own clients tx" ON public.transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'agent') AND public.is_my_client(user_id));

DROP POLICY IF EXISTS "Agents view wallets" ON public.wallets;
CREATE POLICY "Agents view own clients wallets" ON public.wallets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'agent') AND public.is_my_client(user_id));

-- Agents insert wallets ONLY if they have permission and the user is their client
CREATE POLICY "Agents insert wallets when allowed" ON public.wallets FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'agent')
    AND public.is_my_client(user_id)
    AND EXISTS (SELECT 1 FROM public.agent_permissions ap WHERE ap.agent_id = auth.uid() AND ap.can_add_wallets = true)
  );

-- 6. admin_register_client — receives email, links to existing auth user, sets registered_by
CREATE OR REPLACE FUNCTION public.admin_register_client(_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_user uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT id INTO target_user FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF target_user IS NULL THEN RAISE EXCEPTION 'user_not_found'; END IF;

  -- Ensure client role
  INSERT INTO public.user_roles (user_id, role) VALUES (target_user, 'client')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Set registered_by only if empty, or if caller is admin (admins can reassign)
  UPDATE public.profiles
     SET registered_by = CASE
                           WHEN registered_by IS NULL THEN auth.uid()
                           WHEN public.has_role(auth.uid(),'admin') THEN auth.uid()
                           ELSE registered_by
                         END
   WHERE id = target_user;

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(),'register_client','user', target_user::text, jsonb_build_object('email', _email));

  RETURN target_user;
END; $$;

-- 7. client_request_buy — creates pending swap requiring staff approval
CREATE OR REPLACE FUNCTION public.client_request_buy(_from_currency uuid, _to_currency uuid, _from_amount numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  avail numeric; from_price numeric; to_price numeric; to_amount numeric; new_id uuid; rate numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _from_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF _from_currency = _to_currency THEN RAISE EXCEPTION 'same_currency'; END IF;

  SELECT usd_price INTO from_price FROM public.currencies WHERE id = _from_currency AND active = true;
  SELECT usd_price INTO to_price FROM public.currencies WHERE id = _to_currency AND active = true;
  IF COALESCE(from_price,0) <= 0 OR COALESCE(to_price,0) <= 0 THEN RAISE EXCEPTION 'price_unavailable'; END IF;

  SELECT available INTO avail FROM public.wallets WHERE user_id = auth.uid() AND currency_id = _from_currency FOR UPDATE;
  IF avail IS NULL OR avail < _from_amount THEN RAISE EXCEPTION 'insufficient_balance'; END IF;

  rate := from_price / to_price;
  to_amount := _from_amount * rate;

  -- Lock funds
  UPDATE public.wallets
     SET available = available - _from_amount,
         locked = locked + _from_amount
   WHERE user_id = auth.uid() AND currency_id = _from_currency;

  INSERT INTO public.transactions (user_id, currency_id, type, status, amount, usd_value, metadata)
  VALUES (auth.uid(), _from_currency, 'swap', 'pending', -_from_amount, _from_amount * from_price,
    jsonb_build_object('kind','buy_request','to_currency', _to_currency, 'from_amount', _from_amount, 'to_amount', to_amount, 'rate', rate))
  RETURNING id INTO new_id;

  RETURN new_id;
END; $$;

-- 8. staff_process_swap — approve or reject a pending buy_request
CREATE OR REPLACE FUNCTION public.staff_process_swap(_tx_id uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tx RECORD; to_curr uuid; to_amount numeric; from_amount numeric;
  cashback_usd numeric; usdt_id uuid; cashback_amt numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO tx FROM public.transactions WHERE id = _tx_id AND type = 'swap' AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  -- Agents can only act on their clients
  IF public.has_role(auth.uid(),'agent') AND NOT public.is_my_client(tx.user_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  to_curr := (tx.metadata->>'to_currency')::uuid;
  to_amount := (tx.metadata->>'to_amount')::numeric;
  from_amount := (tx.metadata->>'from_amount')::numeric;

  IF _approve THEN
    -- Unlock and remove from source
    UPDATE public.wallets SET locked = locked - from_amount
     WHERE user_id = tx.user_id AND currency_id = tx.currency_id;

    -- Credit destination
    INSERT INTO public.wallets (user_id, currency_id, available)
    VALUES (tx.user_id, to_curr, to_amount)
    ON CONFLICT (user_id, currency_id) DO UPDATE SET available = public.wallets.available + to_amount;

    -- Cashback 0.5% of tx.usd_value credited in USDT (if USDT exists)
    cashback_usd := COALESCE(tx.usd_value,0) * 0.005;
    SELECT id INTO usdt_id FROM public.currencies WHERE upper(symbol) = 'USDT' LIMIT 1;
    IF usdt_id IS NOT NULL AND cashback_usd > 0 THEN
      cashback_amt := cashback_usd; -- USDT ~= 1 USD
      INSERT INTO public.wallets (user_id, currency_id, available)
      VALUES (tx.user_id, usdt_id, cashback_amt)
      ON CONFLICT (user_id, currency_id) DO UPDATE SET available = public.wallets.available + cashback_amt;
      INSERT INTO public.transactions (user_id, currency_id, type, status, amount, usd_value, cashback_amount, metadata)
      VALUES (tx.user_id, usdt_id, 'adjustment', 'completed', cashback_amt, cashback_amt, cashback_amt,
        jsonb_build_object('kind','cashback','source_tx', _tx_id));
    END IF;

    UPDATE public.transactions
       SET status = 'completed', cashback_amount = COALESCE(cashback_usd,0),
           metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('approved_by', auth.uid())
     WHERE id = _tx_id;

    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (tx.user_id,'buy_approved','Compra aprovada','Sua compra foi aprovada.');
  ELSE
    -- Refund
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
END; $$;
