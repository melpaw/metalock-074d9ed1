
-- deposit_addresses
CREATE TABLE public.deposit_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency_id UUID NOT NULL REFERENCES public.currencies(id) ON DELETE CASCADE,
  network TEXT,
  address TEXT,
  memo_tag TEXT,
  qr_image_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, currency_id)
);

GRANT SELECT, INSERT, UPDATE ON public.deposit_addresses TO authenticated;
GRANT ALL ON public.deposit_addresses TO service_role;

ALTER TABLE public.deposit_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own or staff read" ON public.deposit_addresses FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));
CREATE POLICY "staff write" ON public.deposit_addresses FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));

CREATE TRIGGER trg_deposit_addresses_updated
  BEFORE UPDATE ON public.deposit_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- client requests a deposit address (creates a pending row if none)
CREATE OR REPLACE FUNCTION public.client_request_deposit_address(_currency_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT id INTO existing FROM public.deposit_addresses WHERE user_id = auth.uid() AND currency_id = _currency_id;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  INSERT INTO public.deposit_addresses (user_id, currency_id, status)
  VALUES (auth.uid(), _currency_id, 'pending') RETURNING id INTO existing;
  INSERT INTO public.notifications (user_id, type, title, body)
  SELECT ur.user_id, 'deposit_address_request', 'Novo pedido de endereço de depósito',
    'Um cliente solicitou um endereço. Cadastre em Admin → Depósitos.'
  FROM public.user_roles ur WHERE ur.role IN ('admin','agent');
  RETURN existing;
END; $$;

-- admin sets/updates the address & QR
CREATE OR REPLACE FUNCTION public.admin_set_deposit_address(
  _id UUID, _address TEXT, _network TEXT, _memo_tag TEXT, _qr_image_path TEXT, _notes TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.deposit_addresses SET
    address = _address, network = _network, memo_tag = _memo_tag,
    qr_image_path = COALESCE(_qr_image_path, qr_image_path),
    notes = _notes, status = 'ready', updated_at = now()
  WHERE id = _id RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (r.user_id, 'deposit_address_ready', 'Endereço de depósito disponível',
    'Seu endereço para depósito já está pronto.', '/app/wallet');
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(),'set_deposit_address','deposit_address',_id::text, jsonb_build_object('user_id', r.user_id));
END; $$;

-- swap crypto (uses a rate provided by server; recorded in audit)
CREATE OR REPLACE FUNCTION public.client_swap(
  _from_currency UUID, _to_currency UUID, _from_amount NUMERIC, _rate NUMERIC
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE avail NUMERIC; to_amount NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _from_amount <= 0 OR _rate <= 0 THEN RAISE EXCEPTION 'invalid input'; END IF;
  IF _from_currency = _to_currency THEN RAISE EXCEPTION 'same currency'; END IF;
  SELECT available INTO avail FROM public.wallets WHERE user_id=auth.uid() AND currency_id=_from_currency FOR UPDATE;
  IF avail IS NULL OR avail < _from_amount THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  to_amount := _from_amount * _rate;
  UPDATE public.wallets SET available = available - _from_amount
    WHERE user_id=auth.uid() AND currency_id=_from_currency;
  INSERT INTO public.wallets (user_id, currency_id, available)
  VALUES (auth.uid(), _to_currency, to_amount)
  ON CONFLICT (user_id, currency_id) DO UPDATE SET available = public.wallets.available + to_amount;
  INSERT INTO public.transactions (user_id, currency_id, type, status, amount, metadata)
  VALUES (auth.uid(), _from_currency, 'swap', 'completed', -_from_amount,
    jsonb_build_object('to_currency', _to_currency, 'rate', _rate, 'to_amount', to_amount));
  INSERT INTO public.transactions (user_id, currency_id, type, status, amount, metadata)
  VALUES (auth.uid(), _to_currency, 'swap', 'completed', to_amount,
    jsonb_build_object('from_currency', _from_currency, 'rate', _rate, 'from_amount', _from_amount));
END; $$;

-- Storage policies for deposit-qr bucket
CREATE POLICY "deposit qr staff read"
  ON storage.objects FOR SELECT
  USING (bucket_id='deposit-qr' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')));

CREATE POLICY "deposit qr owner read"
  ON storage.objects FOR SELECT
  USING (bucket_id='deposit-qr' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "deposit qr staff write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id='deposit-qr' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')));

CREATE POLICY "deposit qr staff update"
  ON storage.objects FOR UPDATE
  USING (bucket_id='deposit-qr' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')));

CREATE POLICY "deposit qr staff delete"
  ON storage.objects FOR DELETE
  USING (bucket_id='deposit-qr' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')));
