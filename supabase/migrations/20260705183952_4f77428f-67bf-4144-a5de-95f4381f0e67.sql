
-- =========== KYC ===========
CREATE TYPE public.kyc_status AS ENUM ('not_submitted','pending','approved','rejected');

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status public.kyc_status NOT NULL DEFAULT 'not_submitted';

CREATE TABLE public.kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  doc_type TEXT NOT NULL,
  doc_number TEXT NOT NULL,
  country TEXT NOT NULL,
  address TEXT NOT NULL,
  document_path TEXT,
  selfie_path TEXT,
  status public.kyc_status NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES auth.users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.kyc_submissions TO authenticated;
GRANT ALL ON public.kyc_submissions TO service_role;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own kyc" ON public.kyc_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));
CREATE POLICY "users submit own kyc" ON public.kyc_submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff update kyc" ON public.kyc_submissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER kyc_updated_at BEFORE UPDATE ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_profile_kyc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET kyc_status = NEW.status WHERE id = NEW.user_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER kyc_sync_profile AFTER INSERT OR UPDATE OF status ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_kyc();

CREATE OR REPLACE FUNCTION public.admin_review_kyc(_id UUID, _approve BOOLEAN, _notes TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO k FROM public.kyc_submissions WHERE id=_id AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  UPDATE public.kyc_submissions
    SET status = CASE WHEN _approve THEN 'approved'::public.kyc_status ELSE 'rejected'::public.kyc_status END,
        reviewer_id = auth.uid(), review_notes = _notes, reviewed_at = now()
    WHERE id=_id;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (k.user_id, CASE WHEN _approve THEN 'kyc_approved' ELSE 'kyc_rejected' END,
    CASE WHEN _approve THEN 'KYC aprovado' ELSE 'KYC recusado' END,
    COALESCE(_notes, CASE WHEN _approve THEN 'Sua verificação foi aprovada.' ELSE 'Sua verificação foi recusada.' END));
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), CASE WHEN _approve THEN 'kyc_approve' ELSE 'kyc_reject' END, 'kyc', _id::text,
    jsonb_build_object('user_id', k.user_id, 'notes', _notes));
END; $$;

-- =========== NOTIFICATIONS ===========
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "users update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "users delete own notifications" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

-- Notify on transaction status changes
CREATE OR REPLACE FUNCTION public.notify_transaction_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('completed','rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (NEW.user_id, 'transaction_' || NEW.status,
      CASE NEW.type
        WHEN 'deposit' THEN 'Depósito ' || CASE WHEN NEW.status='completed' THEN 'aprovado' ELSE 'recusado' END
        WHEN 'withdrawal' THEN 'Saque ' || CASE WHEN NEW.status='completed' THEN 'aprovado' ELSE 'recusado' END
        ELSE 'Transação atualizada' END,
      'Valor: ' || NEW.amount::text);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER transactions_notify AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_transaction_change();

-- =========== AUTO-ASSIGN AGENT ===========
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION public.auto_assign_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE chosen_agent UUID;
BEGIN
  IF NEW.assigned_to IS NULL THEN
    SELECT ur.user_id INTO chosen_agent
    FROM public.user_roles ur
    LEFT JOIN public.support_tickets t
      ON t.assigned_to = ur.user_id AND t.status IN ('open','pending')
    WHERE ur.role = 'agent'
    GROUP BY ur.user_id
    ORDER BY count(t.id) ASC, random()
    LIMIT 1;
    IF chosen_agent IS NOT NULL THEN NEW.assigned_to := chosen_agent; END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER tickets_auto_assign BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_ticket();

-- Notify user on new ticket message from staff (not from themselves)
CREATE OR REPLACE FUNCTION public.notify_ticket_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ticket_owner UUID; is_internal BOOLEAN;
BEGIN
  is_internal := COALESCE(NEW.is_internal, false);
  IF is_internal THEN RETURN NEW; END IF;
  SELECT user_id INTO ticket_owner FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF ticket_owner IS NOT NULL AND ticket_owner <> NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (ticket_owner, 'ticket_reply', 'Nova resposta no seu ticket',
      LEFT(NEW.body, 140), '/app/support/' || NEW.ticket_id::text);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER ticket_messages_notify AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_message();
