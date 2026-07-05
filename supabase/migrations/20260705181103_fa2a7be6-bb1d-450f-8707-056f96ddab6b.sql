-- Phase 2: Client area, Agent support, Admin oversight

-- Investments table
CREATE TABLE public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  currency_id UUID NOT NULL REFERENCES public.currencies(id),
  amount NUMERIC(24,8) NOT NULL CHECK (amount > 0),
  daily_rate NUMERIC(8,4) NOT NULL,
  duration_days INT NOT NULL,
  accrued NUMERIC(24,8) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own investments" ON public.investments FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));
CREATE POLICY "Users create own investments" ON public.investments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update investments" ON public.investments FOR UPDATE
  USING (public.has_role(auth.uid(),'admin'));

-- Support tickets
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open|pending|resolved|closed
  priority TEXT NOT NULL DEFAULT 'normal', -- low|normal|high|urgent
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ticket read access" ON public.support_tickets FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'agent')
  );
CREATE POLICY "Users create own tickets" ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Agents/Admins update tickets" ON public.support_tickets FOR UPDATE
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent') OR auth.uid() = user_id);

-- Ticket messages
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ticket_messages TO authenticated;
GRANT ALL ON public.ticket_messages TO service_role;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ticket messages read" ON public.ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          t.user_id = auth.uid()
          OR public.has_role(auth.uid(),'admin')
          OR public.has_role(auth.uid(),'agent')
        )
    )
    AND (is_internal = false OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'))
  );
CREATE POLICY "Ticket messages insert" ON public.ticket_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          t.user_id = auth.uid()
          OR public.has_role(auth.uid(),'admin')
          OR public.has_role(auth.uid(),'agent')
        )
    )
  );

-- Update triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_investments_updated BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Allow agents to view profiles and transactions (support needs to see user context)
CREATE POLICY "Agents view profiles" ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(),'agent'));
CREATE POLICY "Agents view transactions" ON public.transactions FOR SELECT
  USING (public.has_role(auth.uid(),'agent'));
CREATE POLICY "Agents view wallets" ON public.wallets FOR SELECT
  USING (public.has_role(auth.uid(),'agent'));

-- Deposit request RPC
CREATE OR REPLACE FUNCTION public.request_deposit(_currency_id UUID, _amount NUMERIC, _tx_hash TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  INSERT INTO public.transactions (user_id, currency_id, type, status, amount, metadata)
  VALUES (auth.uid(), _currency_id, 'deposit', 'pending', _amount, jsonb_build_object('tx_hash', _tx_hash))
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

-- Withdrawal request RPC (locks funds)
CREATE OR REPLACE FUNCTION public.request_withdrawal(_currency_id UUID, _amount NUMERIC, _address TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id UUID; avail NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  SELECT available INTO avail FROM public.wallets WHERE user_id = auth.uid() AND currency_id = _currency_id FOR UPDATE;
  IF avail IS NULL OR avail < _amount THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  UPDATE public.wallets SET available = available - _amount, locked = locked + _amount
    WHERE user_id = auth.uid() AND currency_id = _currency_id;
  INSERT INTO public.transactions (user_id, currency_id, type, status, amount, metadata)
  VALUES (auth.uid(), _currency_id, 'withdrawal', 'pending', _amount, jsonb_build_object('address', _address))
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

-- Approve/reject deposit (admin)
CREATE OR REPLACE FUNCTION public.admin_process_deposit(_tx_id UUID, _approve BOOLEAN)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tx RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO tx FROM public.transactions WHERE id = _tx_id AND type='deposit' AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF _approve THEN
    INSERT INTO public.wallets (user_id, currency_id, available) VALUES (tx.user_id, tx.currency_id, tx.amount)
    ON CONFLICT (user_id, currency_id) DO UPDATE SET available = public.wallets.available + tx.amount;
    UPDATE public.transactions SET status='completed' WHERE id=_tx_id;
  ELSE
    UPDATE public.transactions SET status='rejected' WHERE id=_tx_id;
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), CASE WHEN _approve THEN 'approve_deposit' ELSE 'reject_deposit' END, 'transaction', _tx_id::text, jsonb_build_object('amount', tx.amount));
END; $$;

-- Approve/reject withdrawal (admin)
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(_tx_id UUID, _approve BOOLEAN)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tx RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO tx FROM public.transactions WHERE id = _tx_id AND type='withdrawal' AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF _approve THEN
    UPDATE public.wallets SET locked = locked - tx.amount
      WHERE user_id = tx.user_id AND currency_id = tx.currency_id;
    UPDATE public.transactions SET status='completed' WHERE id=_tx_id;
  ELSE
    UPDATE public.wallets SET locked = locked - tx.amount, available = available + tx.amount
      WHERE user_id = tx.user_id AND currency_id = tx.currency_id;
    UPDATE public.transactions SET status='rejected' WHERE id=_tx_id;
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), CASE WHEN _approve THEN 'approve_withdrawal' ELSE 'reject_withdrawal' END, 'transaction', _tx_id::text, jsonb_build_object('amount', tx.amount));
END; $$;

-- Invest in plan RPC
CREATE OR REPLACE FUNCTION public.invest_in_plan(_plan_id UUID, _currency_id UUID, _amount NUMERIC)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p RECORD; avail NUMERIC; inv_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT * INTO p FROM public.plans WHERE id=_plan_id AND active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan not found'; END IF;
  IF _amount < p.min_amount OR _amount > p.max_amount THEN RAISE EXCEPTION 'amount out of range'; END IF;
  SELECT available INTO avail FROM public.wallets WHERE user_id=auth.uid() AND currency_id=_currency_id FOR UPDATE;
  IF avail IS NULL OR avail < _amount THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  UPDATE public.wallets SET available = available - _amount WHERE user_id=auth.uid() AND currency_id=_currency_id;
  INSERT INTO public.investments (user_id, plan_id, currency_id, amount, daily_rate, duration_days, end_date)
  VALUES (auth.uid(), _plan_id, _currency_id, _amount, p.daily_rate, p.duration_days, now() + (p.duration_days || ' days')::interval)
  RETURNING id INTO inv_id;
  INSERT INTO public.transactions (user_id, currency_id, type, status, amount, metadata)
  VALUES (auth.uid(), _currency_id, 'investment', 'completed', -_amount, jsonb_build_object('investment_id', inv_id, 'plan_id', _plan_id));
  RETURN inv_id;
END; $$;

-- Admin: assign agent role
CREATE OR REPLACE FUNCTION public.admin_set_role(_user_id UUID, _role app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(),'set_role','user',_user_id::text, jsonb_build_object('role', _role));
END; $$;
