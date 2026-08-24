CREATE OR REPLACE FUNCTION public.admin_update_transaction(_tx_id uuid, _status text, _note text DEFAULT NULL, _hidden boolean DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx RECORD;
  enum_status public.tx_status;
  old_status public.tx_status;
  wallet_delta numeric := 0;
  tx_abs numeric;
  deposit_net numeric;
  cur_locked numeric;
  refund numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO tx FROM public.transactions WHERE id = _tx_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;

  old_status := tx.status;
  tx_abs := abs(tx.amount);
  deposit_net := GREATEST(tx_abs - COALESCE(tx.fee, 0), 0);

  enum_status := CASE lower(COALESCE(_status, tx.status::text))
    WHEN 'approved' THEN 'completed'::public.tx_status
    WHEN 'completed' THEN 'completed'::public.tx_status
    WHEN 'rejected' THEN 'rejected'::public.tx_status
    WHEN 'cancelled' THEN 'cancelled'::public.tx_status
    WHEN 'canceled' THEN 'cancelled'::public.tx_status
    ELSE 'pending'::public.tx_status
  END;

  IF old_status IS DISTINCT FROM enum_status THEN
    IF tx.type = 'deposit' THEN
      IF old_status = 'pending' AND enum_status = 'completed' THEN
        INSERT INTO public.wallets (user_id, currency_id, available, locked)
        VALUES (tx.user_id, tx.currency_id, deposit_net, 0)
        ON CONFLICT (user_id, currency_id) DO UPDATE
          SET available = public.wallets.available + deposit_net,
              locked = GREATEST(public.wallets.locked - deposit_net, 0);
      ELSIF old_status = 'pending' AND enum_status IN ('rejected','cancelled') THEN
        UPDATE public.wallets
           SET locked = GREATEST(locked - deposit_net, 0)
         WHERE user_id = tx.user_id AND currency_id = tx.currency_id;
      ELSIF old_status = 'completed' AND enum_status = 'pending' THEN
        INSERT INTO public.wallets (user_id, currency_id, available, locked)
        VALUES (tx.user_id, tx.currency_id, -deposit_net, deposit_net)
        ON CONFLICT (user_id, currency_id) DO UPDATE
          SET available = public.wallets.available - deposit_net,
              locked = public.wallets.locked + deposit_net;
      ELSIF old_status = 'completed' AND enum_status IN ('rejected','cancelled') THEN
        INSERT INTO public.wallets (user_id, currency_id, available)
        VALUES (tx.user_id, tx.currency_id, -deposit_net)
        ON CONFLICT (user_id, currency_id) DO UPDATE
          SET available = public.wallets.available - deposit_net;
        wallet_delta := -deposit_net;
      ELSIF old_status IN ('rejected','cancelled') AND enum_status = 'pending' THEN
        INSERT INTO public.wallets (user_id, currency_id, available, locked)
        VALUES (tx.user_id, tx.currency_id, 0, deposit_net)
        ON CONFLICT (user_id, currency_id) DO UPDATE
          SET locked = public.wallets.locked + deposit_net;
      ELSIF old_status IN ('rejected','cancelled') AND enum_status = 'completed' THEN
        INSERT INTO public.wallets (user_id, currency_id, available)
        VALUES (tx.user_id, tx.currency_id, deposit_net)
        ON CONFLICT (user_id, currency_id) DO UPDATE
          SET available = public.wallets.available + deposit_net;
        wallet_delta := deposit_net;
      END IF;

    ELSIF tx.type = 'withdrawal' THEN
      SELECT COALESCE(locked, 0) INTO cur_locked FROM public.wallets
        WHERE user_id = tx.user_id AND currency_id = tx.currency_id;
      cur_locked := COALESCE(cur_locked, 0);

      IF old_status = 'pending' AND enum_status = 'completed' THEN
        -- funds leave the platform: only release the locked portion
        UPDATE public.wallets
           SET locked = GREATEST(locked - tx_abs, 0)
         WHERE user_id = tx.user_id AND currency_id = tx.currency_id;

      ELSIF old_status = 'pending' AND enum_status IN ('rejected','cancelled') THEN
        -- refund only what is actually locked, never create balance
        refund := LEAST(cur_locked, tx_abs);
        UPDATE public.wallets
           SET locked = GREATEST(locked - refund, 0),
               available = available + refund
         WHERE user_id = tx.user_id AND currency_id = tx.currency_id;
        wallet_delta := refund;

      ELSIF old_status = 'completed' AND enum_status = 'pending' THEN
        -- re-open a finished withdrawal: money goes back to locked, NOT available
        INSERT INTO public.wallets (user_id, currency_id, available, locked)
        VALUES (tx.user_id, tx.currency_id, 0, tx_abs)
        ON CONFLICT (user_id, currency_id) DO UPDATE
          SET locked = public.wallets.locked + tx_abs;

      ELSIF old_status = 'completed' AND enum_status IN ('rejected','cancelled') THEN
        -- money never left after all: give it back once
        INSERT INTO public.wallets (user_id, currency_id, available)
        VALUES (tx.user_id, tx.currency_id, tx_abs)
        ON CONFLICT (user_id, currency_id) DO UPDATE
          SET available = public.wallets.available + tx_abs;
        wallet_delta := tx_abs;

      ELSIF old_status IN ('rejected','cancelled') AND enum_status = 'pending' THEN
        -- lock the funds again
        UPDATE public.wallets
           SET available = available - tx_abs,
               locked = locked + tx_abs
         WHERE user_id = tx.user_id AND currency_id = tx.currency_id;

      ELSIF old_status IN ('rejected','cancelled') AND enum_status = 'completed' THEN
        INSERT INTO public.wallets (user_id, currency_id, available)
        VALUES (tx.user_id, tx.currency_id, -tx_abs)
        ON CONFLICT (user_id, currency_id) DO UPDATE
          SET available = public.wallets.available - tx_abs;
        wallet_delta := -tx_abs;
      END IF;

    ELSIF tx.type = 'adjustment' THEN
      IF old_status <> 'completed' AND enum_status = 'completed' THEN
        wallet_delta := tx.amount;
      ELSIF old_status = 'completed' AND enum_status <> 'completed' THEN
        wallet_delta := -tx.amount;
      END IF;

      IF wallet_delta <> 0 THEN
        INSERT INTO public.wallets (user_id, currency_id, available)
        VALUES (tx.user_id, tx.currency_id, wallet_delta)
        ON CONFLICT (user_id, currency_id) DO UPDATE
          SET available = public.wallets.available + wallet_delta;
      END IF;
    END IF;
  END IF;

  UPDATE public.transactions
     SET status = enum_status,
         note = COALESCE(_note, note),
         hidden = COALESCE(_hidden, hidden),
         metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('ui_status', lower(COALESCE(_status, enum_status::text)))
   WHERE id = _tx_id;

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(),'update_tx','transaction', _tx_id::text,
    jsonb_build_object('from', old_status, 'to', enum_status, 'wallet_delta', wallet_delta));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_kyc_status(_id uuid, _status public.kyc_status, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE k RECORD;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO k FROM public.kyc_submissions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;

  UPDATE public.kyc_submissions
     SET status = _status,
         reviewer_id = auth.uid(),
         review_notes = COALESCE(_notes, review_notes),
         reviewed_at = CASE WHEN _status = 'pending' THEN NULL ELSE now() END
   WHERE id = _id;

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (k.user_id,
    CASE _status WHEN 'approved' THEN 'kyc_approved' WHEN 'rejected' THEN 'kyc_rejected' ELSE 'kyc_updated' END,
    CASE _status WHEN 'approved' THEN 'Identity verification approved'
                 WHEN 'rejected' THEN 'Identity verification rejected'
                 ELSE 'Identity verification updated' END,
    COALESCE(_notes,
      CASE _status WHEN 'approved' THEN 'Your verification has been approved.'
                   WHEN 'rejected' THEN 'Your verification was rejected. Please submit your documents again.'
                   ELSE 'The status of your verification has changed.' END));

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'kyc_set_status', 'kyc', _id::text,
    jsonb_build_object('user_id', k.user_id, 'from', k.status, 'to', _status, 'notes', _notes));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_kyc_status(uuid, public.kyc_status, text) TO authenticated;

ALTER TABLE public.profiles ALTER COLUMN locale SET DEFAULT 'en';