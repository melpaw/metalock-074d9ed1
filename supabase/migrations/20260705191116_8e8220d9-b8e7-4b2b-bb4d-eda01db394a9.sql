
-- 1) client_permissions
CREATE TABLE public.client_permissions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  allow_send BOOLEAN NOT NULL DEFAULT true,
  allow_buy BOOLEAN NOT NULL DEFAULT true,
  allow_swap BOOLEAN NOT NULL DEFAULT true,
  allow_deposit BOOLEAN NOT NULL DEFAULT true,
  allow_withdrawal BOOLEAN NOT NULL DEFAULT true,
  allow_stake BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_permissions TO authenticated;
GRANT ALL ON public.client_permissions TO service_role;
ALTER TABLE public.client_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or staff read" ON public.client_permissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));
CREATE POLICY "staff write" ON public.client_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));

-- 2) client_admin_notes
CREATE TABLE public.client_admin_notes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_admin_notes TO authenticated;
GRANT ALL ON public.client_admin_notes TO service_role;
ALTER TABLE public.client_admin_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff only" ON public.client_admin_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));

-- 3) bank_accounts
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  last4 TEXT NOT NULL,
  country TEXT,
  iban_masked TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or staff read" ON public.bank_accounts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));
CREATE POLICY "own insert" ON public.bank_accounts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own or staff delete" ON public.bank_accounts FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- 4) Extend profiles with optional fields the client detail edits
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS full_address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- 5) Admin RPC to update client profile fields
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  _user_id UUID,
  _full_name TEXT,
  _date_of_birth DATE,
  _postal_code TEXT,
  _city TEXT,
  _country TEXT,
  _full_address TEXT,
  _phone TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.profiles SET
    full_name = COALESCE(_full_name, full_name),
    date_of_birth = _date_of_birth,
    postal_code = _postal_code,
    city = _city,
    country = _country,
    full_address = _full_address,
    phone = _phone,
    updated_at = now()
  WHERE id = _user_id;
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(),'update_profile','user',_user_id::text, jsonb_build_object('by','admin'));
END; $$;
