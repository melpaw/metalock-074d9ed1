
-- External send request (crypto out to arbitrary address) - creates pending withdrawal, locks funds.
CREATE OR REPLACE FUNCTION public.client_request_external_send(
  _currency_id uuid,
  _amount numeric,
  _to_address text,
  _notes text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  avail numeric;
  price numeric;
  usd numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF _to_address IS NULL OR length(trim(_to_address)) < 4 THEN RAISE EXCEPTION 'invalid_address'; END IF;

  SELECT available INTO avail
    FROM public.wallets
   WHERE user_id = auth.uid() AND currency_id = _currency_id
   FOR UPDATE;
  IF avail IS NULL OR avail < _amount THEN RAISE EXCEPTION 'insufficient_balance'; END IF;

  SELECT usd_price INTO price FROM public.currencies WHERE id = _currency_id;
  usd := COALESCE(price, 0) * _amount;

  UPDATE public.wallets
     SET available = available - _amount,
         locked    = locked    + _amount
   WHERE user_id = auth.uid() AND currency_id = _currency_id;

  INSERT INTO public.transactions (user_id, currency_id, type, status, amount, usd_value, note, metadata)
  VALUES (
    auth.uid(), _currency_id, 'withdrawal', 'pending', _amount, usd, _notes,
    jsonb_build_object(
      'kind', 'external_send',
      'to_address', _to_address,
      'notes', _notes
    )
  ) RETURNING id INTO new_id;

  INSERT INTO public.notifications (user_id, type, title, body)
  SELECT ur.user_id, 'external_send_requested', 'Nova solicitação de envio',
    'Um cliente solicitou envio externo aguardando aprovação.'
  FROM public.user_roles ur WHERE ur.role IN ('admin','agent');

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.client_request_external_send(uuid, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_request_external_send(uuid, numeric, text, text) TO authenticated;
