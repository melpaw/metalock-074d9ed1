
-- Add WITH CHECK clauses to admin UPDATE policies
DROP POLICY IF EXISTS "Admins update investments" ON public.investments;
CREATE POLICY "Admins update investments" ON public.investments FOR UPDATE
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "staff update kyc" ON public.kyc_submissions;
CREATE POLICY "staff update kyc" ON public.kyc_submissions FOR UPDATE
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Agents/Admins update tickets" ON public.support_tickets;
CREATE POLICY "Agents/Admins update tickets" ON public.support_tickets FOR UPDATE
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'agent') OR auth.uid() = user_id)
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'agent') OR auth.uid() = user_id);

-- Lock down SECURITY DEFINER function EXECUTE grants
-- Internal helpers: revoke from anon and authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_my_client(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_kyc() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_transaction_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_ticket_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_assign_ticket() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Admin/agent-only RPCs: revoke from anon, keep authenticated (internal role checks enforce authz)
REVOKE EXECUTE ON FUNCTION public.admin_add_transaction(uuid, tx_type, uuid, numeric, text, text, text, text, boolean, timestamptz, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_process_deposit(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_register_client(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, uuid, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_transaction(uuid, text, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_currency_price(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, date, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_kyc(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_deposit_address(uuid, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_insurance_quote(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.staff_process_swap(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_agent_display_name(text) FROM PUBLIC, anon;

-- Client-callable RPCs: revoke from anon only
REVOKE EXECUTE ON FUNCTION public.request_deposit(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.client_swap(uuid, uuid, numeric, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.client_request_buy(uuid, uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.client_request_withdrawal_v2(uuid, numeric, uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.client_respond_insurance(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.client_internal_transfer(uuid, uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.client_request_deposit_address(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.invest_in_plan(uuid, uuid, numeric) FROM PUBLIC, anon;
