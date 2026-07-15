
-- Add IBAN column and update policy for bank_accounts
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS iban text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP POLICY IF EXISTS "own update" ON public.bank_accounts;
CREATE POLICY "own update" ON public.bank_accounts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_bank_accounts_updated_at ON public.bank_accounts;
CREATE TRIGGER trg_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- New RPC: bank withdrawal with fiat target currency + 2.5% conversion fee
CREATE OR REPLACE FUNCTION public.client_request_bank_withdrawal(
  _currency_id uuid,
  _amount numeric,
  _bank_id uuid,
  _fiat_currency text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE new_id uuid; avail numeric; price numeric; usd numeric; fee_amt numeric; fiat text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  fiat := upper(coalesce(_fiat_currency,''));
  IF fiat NOT IN ('USD','BRL','EUR') THEN RAISE EXCEPTION 'invalid_fiat'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bank_accounts WHERE id=_bank_id AND user_id=auth.uid()) THEN
    RAISE EXCEPTION 'invalid_bank';
  END IF;
  SELECT available INTO avail FROM public.wallets
    WHERE user_id=auth.uid() AND currency_id=_currency_id FOR UPDATE;
  IF avail IS NULL OR avail < _amount THEN RAISE EXCEPTION 'insufficient_balance'; END IF;
  SELECT usd_price INTO price FROM public.currencies WHERE id=_currency_id;
  usd := COALESCE(price,0) * _amount;
  fee_amt := round(usd * 0.025, 8);
  UPDATE public.wallets SET available=available-_amount, locked=locked+_amount
    WHERE user_id=auth.uid() AND currency_id=_currency_id;
  INSERT INTO public.transactions (user_id, currency_id, type, status, amount, fee, usd_value, metadata)
  VALUES (auth.uid(), _currency_id, 'withdrawal', 'pending', _amount, fee_amt, usd,
    jsonb_build_object(
      'kind', 'bank_withdrawal',
      'bank_id', _bank_id,
      'fiat_currency', fiat,
      'conversion_fee_rate', 0.025,
      'conversion_fee_usd', fee_amt,
      'conversion_fee_status', 'pending_payment'
    ))
  RETURNING id INTO new_id;
  INSERT INTO public.notifications (user_id, type, title, body)
  SELECT ur.user_id, 'bank_withdrawal_requested', 'Nova solicitação de saque bancário',
    'Um cliente solicitou saque bancário aguardando pagamento da taxa de conversão.'
  FROM public.user_roles ur WHERE ur.role IN ('admin','agent');
  RETURN new_id;
END;$$;

GRANT EXECUTE ON FUNCTION public.client_request_bank_withdrawal(uuid, numeric, uuid, text) TO authenticated;
