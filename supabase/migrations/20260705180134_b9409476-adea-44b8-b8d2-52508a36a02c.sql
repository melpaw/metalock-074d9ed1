
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin','agent','client');
CREATE TYPE public.account_status AS ENUM ('active','frozen','blocked');
CREATE TYPE public.tx_type AS ENUM ('deposit','withdrawal','investment','profit','adjustment','transfer');
CREATE TYPE public.tx_status AS ENUM ('pending','completed','rejected','cancelled');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  status public.account_status NOT NULL DEFAULT 'active',
  kyc_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Profiles policies
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Roles policies
CREATE POLICY "user_roles_self_select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Currencies
CREATE TABLE public.currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  coingecko_id TEXT,
  network TEXT,
  decimals INT NOT NULL DEFAULT 8,
  logo_url TEXT,
  min_deposit NUMERIC(28,10) NOT NULL DEFAULT 0,
  min_withdraw NUMERIC(28,10) NOT NULL DEFAULT 0,
  withdraw_fee NUMERIC(28,10) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.currencies TO anon, authenticated;
GRANT ALL ON public.currencies TO service_role;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "currencies_public_read" ON public.currencies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "currencies_admin_write" ON public.currencies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Plans
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  min_amount NUMERIC(28,2) NOT NULL,
  max_amount NUMERIC(28,2) NOT NULL,
  daily_rate NUMERIC(6,4) NOT NULL,
  duration_days INT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "plans_admin_write" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Wallets
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency_id UUID NOT NULL REFERENCES public.currencies(id) ON DELETE RESTRICT,
  available NUMERIC(28,10) NOT NULL DEFAULT 0,
  locked NUMERIC(28,10) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, currency_id)
);
GRANT SELECT, INSERT, UPDATE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets_self_select" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "wallets_admin_all" ON public.wallets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency_id UUID REFERENCES public.currencies(id),
  type public.tx_type NOT NULL,
  status public.tx_status NOT NULL DEFAULT 'pending',
  amount NUMERIC(28,10) NOT NULL,
  fee NUMERIC(28,10) NOT NULL DEFAULT 0,
  reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx_self_select" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tx_admin_all" ON public.transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin_read" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Handle new user: create profile + assign role (first user = admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count INT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  SELECT count(*) INTO user_count FROM public.user_roles;
  assigned_role := CASE WHEN user_count = 0 THEN 'admin'::public.app_role ELSE 'client'::public.app_role END;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Admin balance adjustment RPC
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  _user_id UUID, _currency_id UUID, _delta NUMERIC, _reason TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  INSERT INTO public.wallets (user_id, currency_id, available)
  VALUES (_user_id, _currency_id, _delta)
  ON CONFLICT (user_id, currency_id) DO UPDATE SET available = public.wallets.available + _delta;

  INSERT INTO public.transactions (user_id, currency_id, type, status, amount, metadata)
  VALUES (_user_id, _currency_id, 'adjustment', 'completed', _delta, jsonb_build_object('reason', _reason, 'actor', auth.uid()));

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'admin_adjust_balance', 'user', _user_id::text,
    jsonb_build_object('currency_id', _currency_id, 'delta', _delta, 'reason', _reason));
END;
$$;

-- Seed currencies
INSERT INTO public.currencies (symbol, name, coingecko_id, network, decimals) VALUES
  ('BTC','Bitcoin','bitcoin','Bitcoin',8),
  ('ETH','Ethereum','ethereum','Ethereum',18),
  ('USDT','Tether','tether','Ethereum',6),
  ('USDC','USD Coin','usd-coin','Ethereum',6),
  ('BNB','BNB','binancecoin','BSC',18),
  ('SOL','Solana','solana','Solana',9),
  ('XRP','XRP','ripple','XRP Ledger',6),
  ('ADA','Cardano','cardano','Cardano',6),
  ('DOGE','Dogecoin','dogecoin','Dogecoin',8),
  ('TRX','TRON','tron','Tron',6),
  ('MATIC','Polygon','matic-network','Polygon',18),
  ('AVAX','Avalanche','avalanche-2','Avalanche',18),
  ('LTC','Litecoin','litecoin','Litecoin',8);

-- Seed plans
INSERT INTO public.plans (name, description, min_amount, max_amount, daily_rate, duration_days) VALUES
  ('Bronze','Plano inicial', 100, 999, 0.008, 30),
  ('Prata','Plano intermediário', 1000, 4999, 0.012, 45),
  ('Ouro','Plano avançado', 5000, 19999, 0.018, 60),
  ('Platinum','Plano premium', 20000, 99999, 0.024, 90),
  ('VIP','Plano exclusivo', 100000, 1000000, 0.030, 120);
