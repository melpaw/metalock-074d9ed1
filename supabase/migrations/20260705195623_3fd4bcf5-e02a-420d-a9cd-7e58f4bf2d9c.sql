
-- 1) Trusted price source on currencies
ALTER TABLE public.currencies
  ADD COLUMN IF NOT EXISTS usd_price NUMERIC(28,10),
  ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMPTZ;

-- Admin RPC to update trusted prices (called by scheduled job / admin UI)
CREATE OR REPLACE FUNCTION public.admin_update_currency_price(_currency_id uuid, _usd_price numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _usd_price IS NULL OR _usd_price <= 0 THEN RAISE EXCEPTION 'invalid price'; END IF;
  UPDATE public.currencies SET usd_price = _usd_price, price_updated_at = now() WHERE id = _currency_id;
END; $$;
REVOKE ALL ON FUNCTION public.admin_update_currency_price(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_currency_price(uuid, numeric) TO authenticated;

-- 2) Rewrite client_swap: ignore client rate, compute from trusted prices
CREATE OR REPLACE FUNCTION public.client_swap(_from_currency uuid, _to_currency uuid, _from_amount numeric, _rate numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avail NUMERIC;
  from_price NUMERIC;
  to_price NUMERIC;
  price_age INTERVAL;
  server_rate NUMERIC;
  to_amount NUMERIC;
  FEE_BPS CONSTANT NUMERIC := 30; -- 0.30% swap fee
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _from_amount <= 0 THEN RAISE EXCEPTION 'invalid input'; END IF;
  IF _from_currency = _to_currency THEN RAISE EXCEPTION 'same currency'; END IF;

  SELECT usd_price, (now() - price_updated_at) INTO from_price, price_age
    FROM public.currencies WHERE id = _from_currency AND active = true;
  IF from_price IS NULL OR from_price <= 0 THEN RAISE EXCEPTION 'source price unavailable'; END IF;
  IF price_age IS NULL OR price_age > interval '1 hour' THEN RAISE EXCEPTION 'stale source price'; END IF;

  SELECT usd_price, (now() - price_updated_at) INTO to_price, price_age
    FROM public.currencies WHERE id = _to_currency AND active = true;
  IF to_price IS NULL OR to_price <= 0 THEN RAISE EXCEPTION 'destination price unavailable'; END IF;
  IF price_age IS NULL OR price_age > interval '1 hour' THEN RAISE EXCEPTION 'stale destination price'; END IF;

  server_rate := (from_price / to_price) * ((10000 - FEE_BPS) / 10000.0);

  SELECT available INTO avail FROM public.wallets
    WHERE user_id = auth.uid() AND currency_id = _from_currency FOR UPDATE;
  IF avail IS NULL OR avail < _from_amount THEN RAISE EXCEPTION 'insufficient balance'; END IF;

  to_amount := _from_amount * server_rate;

  UPDATE public.wallets SET available = available - _from_amount
    WHERE user_id = auth.uid() AND currency_id = _from_currency;
  INSERT INTO public.wallets (user_id, currency_id, available)
  VALUES (auth.uid(), _to_currency, to_amount)
  ON CONFLICT (user_id, currency_id) DO UPDATE SET available = public.wallets.available + to_amount;

  INSERT INTO public.transactions (user_id, currency_id, type, status, amount, metadata)
  VALUES (auth.uid(), _from_currency, 'swap', 'completed', -_from_amount,
    jsonb_build_object('to_currency', _to_currency, 'rate', server_rate, 'to_amount', to_amount, 'client_rate_ignored', _rate));
  INSERT INTO public.transactions (user_id, currency_id, type, status, amount, metadata)
  VALUES (auth.uid(), _to_currency, 'swap', 'completed', to_amount,
    jsonb_build_object('from_currency', _from_currency, 'rate', server_rate, 'from_amount', _from_amount));
END; $$;

-- 3) Fix mutable search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- 4) Revoke public/anon/authenticated EXECUTE on internal trigger-only functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_kyc() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_transaction_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_ticket_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_assign_ticket() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 5) Revoke anon EXECUTE on all user-facing SECURITY DEFINER RPCs (require auth)
REVOKE EXECUTE ON FUNCTION public.request_deposit(uuid, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(uuid, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.invest_in_plan(uuid, uuid, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.client_swap(uuid, uuid, numeric, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.client_request_deposit_address(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_process_deposit(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_kyc(uuid, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, uuid, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, date, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_deposit_address(uuid, text, text, text, text, text) FROM anon;
