
-- Revoke default PUBLIC execute on all SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.sync_profile_kyc() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_transaction_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_assign_ticket() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_ticket_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.request_deposit(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.client_swap(uuid, uuid, numeric, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.client_request_deposit_address(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.invest_in_plan(uuid, uuid, numeric) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.admin_process_deposit(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, uuid, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_deposit_address(uuid, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_currency_price(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, date, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_kyc(uuid, boolean, text) FROM PUBLIC, anon;

-- has_role is used by RLS policies; authenticated must retain execute
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Client RPCs: authenticated only
GRANT EXECUTE ON FUNCTION public.request_deposit(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_swap(uuid, uuid, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_request_deposit_address(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invest_in_plan(uuid, uuid, numeric) TO authenticated;

-- Admin RPCs: authenticated (internal has_role check enforces admin/agent)
GRANT EXECUTE ON FUNCTION public.admin_process_deposit(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_deposit_address(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_currency_price(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, date, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_kyc(uuid, boolean, text) TO authenticated;
