
-- Add 'transfer' to tx_type enum if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='tx_type' AND e.enumlabel='transfer') THEN
    ALTER TYPE public.tx_type ADD VALUE 'transfer';
  END IF;
END$$;

-- Withdrawal v2 with bank + insurance flag
CREATE OR REPLACE FUNCTION public.client_request_withdrawal_v2(_currency_id uuid, _amount numeric, _bank_id uuid, _insurance_requested boolean)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE new_id uuid; avail numeric; price numeric; usd numeric; fee_amt numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bank_accounts WHERE id=_bank_id AND user_id=auth.uid()) THEN
    RAISE EXCEPTION 'invalid_bank';
  END IF;
  SELECT available INTO avail FROM public.wallets WHERE user_id=auth.uid() AND currency_id=_currency_id FOR UPDATE;
  IF avail IS NULL OR avail < _amount THEN RAISE EXCEPTION 'insufficient_balance'; END IF;
  SELECT usd_price INTO price FROM public.currencies WHERE id=_currency_id;
  usd := COALESCE(price,0) * _amount;
  fee_amt := round(usd * 0.035, 8);
  UPDATE public.wallets SET available=available-_amount, locked=locked+_amount
    WHERE user_id=auth.uid() AND currency_id=_currency_id;
  INSERT INTO public.transactions (user_id, currency_id, type, status, amount, fee, usd_value, metadata)
  VALUES (auth.uid(), _currency_id, 'withdrawal', 'pending', _amount, fee_amt, usd,
    jsonb_build_object(
      'bank_id', _bank_id,
      'conversion_fee_rate', 0.035,
      'insurance_requested', COALESCE(_insurance_requested,false),
      'insurance_status', CASE WHEN COALESCE(_insurance_requested,false) THEN 'pending_quote' ELSE null END
    ))
  RETURNING id INTO new_id;
  IF COALESCE(_insurance_requested,false) THEN
    INSERT INTO public.notifications (user_id, type, title, body)
    SELECT ur.user_id, 'insurance_quote_requested', 'Novo pedido de cotação de seguro',
      'Um cliente solicitou cotação de seguro para um saque.'
    FROM public.user_roles ur WHERE ur.role IN ('admin','agent');
  END IF;
  RETURN new_id;
END;$$;

-- Admin/Agent quotes insurance %
CREATE OR REPLACE FUNCTION public.admin_set_insurance_quote(_tx_id uuid, _percent numeric)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE tx RECORD;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _percent IS NULL OR _percent < 0 OR _percent > 100 THEN RAISE EXCEPTION 'invalid_percent'; END IF;
  SELECT * INTO tx FROM public.transactions WHERE id=_tx_id AND type='withdrawal' AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF public.has_role(auth.uid(),'agent') AND NOT public.is_my_client(tx.user_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.transactions
    SET metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object(
      'insurance_percent', _percent,
      'insurance_status', 'quoted',
      'insurance_quoted_by', auth.uid()
    )
  WHERE id=_tx_id;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (tx.user_id, 'insurance_quoted', 'Cotação de seguro disponível',
    'Sua cotação está pronta: ' || _percent::text || '%', '/app/wallets');
END;$$;

-- Client responds to insurance quote
CREATE OR REPLACE FUNCTION public.client_respond_insurance(_tx_id uuid, _approve boolean, _payment_note text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE tx RECORD; new_ticket uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT * INTO tx FROM public.transactions WHERE id=_tx_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF COALESCE(tx.metadata->>'insurance_status','') <> 'quoted' THEN RAISE EXCEPTION 'not_quoted'; END IF;

  IF _approve THEN
    INSERT INTO public.support_tickets (user_id, subject, status, category)
    VALUES (auth.uid(), 'Pagamento de seguro — saque ' || substr(_tx_id::text,1,8), 'open', 'insurance_payment')
    RETURNING id INTO new_ticket;
    INSERT INTO public.ticket_messages (ticket_id, sender_id, body)
    VALUES (new_ticket, auth.uid(),
      'Aprovei a cotação de seguro de ' || COALESCE(tx.metadata->>'insurance_percent','?') || '%. ' ||
      'Forma/observação de pagamento: ' || COALESCE(_payment_note,'-'));
    UPDATE public.transactions
      SET metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object(
        'insurance_status','approved','insurance_ticket_id', new_ticket)
    WHERE id=_tx_id;
    INSERT INTO public.notifications (user_id, type, title, body)
    SELECT ur.user_id, 'insurance_approved', 'Cliente aprovou cotação de seguro',
      'Ticket aberto para acerto do pagamento.'
    FROM public.user_roles ur WHERE ur.role IN ('admin','agent');
  ELSE
    UPDATE public.transactions
      SET metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('insurance_status','rejected')
    WHERE id=_tx_id;
    INSERT INTO public.notifications (user_id, type, title, body)
    SELECT ur.user_id, 'insurance_rejected', 'Cliente recusou cotação de seguro',
      'O saque segue sem seguro.'
    FROM public.user_roles ur WHERE ur.role IN ('admin','agent');
  END IF;
  RETURN new_ticket;
END;$$;

-- Internal transfer between own wallets
CREATE OR REPLACE FUNCTION public.client_internal_transfer(_from_currency uuid, _to_currency uuid, _amount numeric)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE avail numeric; from_price numeric; to_price numeric; to_amount numeric; rate numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF _from_currency = _to_currency THEN RAISE EXCEPTION 'same_currency'; END IF;
  SELECT usd_price INTO from_price FROM public.currencies WHERE id=_from_currency AND active=true;
  SELECT usd_price INTO to_price FROM public.currencies WHERE id=_to_currency AND active=true;
  IF COALESCE(from_price,0)<=0 OR COALESCE(to_price,0)<=0 THEN RAISE EXCEPTION 'price_unavailable'; END IF;
  SELECT available INTO avail FROM public.wallets WHERE user_id=auth.uid() AND currency_id=_from_currency FOR UPDATE;
  IF avail IS NULL OR avail < _amount THEN RAISE EXCEPTION 'insufficient_balance'; END IF;
  rate := from_price / to_price;
  to_amount := _amount * rate;
  UPDATE public.wallets SET available = available - _amount
    WHERE user_id=auth.uid() AND currency_id=_from_currency;
  INSERT INTO public.wallets (user_id, currency_id, available)
  VALUES (auth.uid(), _to_currency, to_amount)
  ON CONFLICT (user_id, currency_id) DO UPDATE SET available = public.wallets.available + to_amount;
  INSERT INTO public.transactions (user_id, currency_id, type, status, amount, usd_value, metadata)
  VALUES (auth.uid(), _from_currency, 'transfer', 'completed', -_amount, _amount*from_price,
    jsonb_build_object('kind','internal_transfer','to_currency',_to_currency,'to_amount',to_amount,'rate',rate));
  INSERT INTO public.transactions (user_id, currency_id, type, status, amount, usd_value, metadata)
  VALUES (auth.uid(), _to_currency, 'transfer', 'completed', to_amount, to_amount*to_price,
    jsonb_build_object('kind','internal_transfer','from_currency',_from_currency,'from_amount',_amount,'rate',rate));
END;$$;
