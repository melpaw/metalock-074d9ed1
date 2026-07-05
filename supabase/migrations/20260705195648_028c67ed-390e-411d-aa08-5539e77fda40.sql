
-- Revoke default PUBLIC grant on all SECURITY DEFINER RPCs and re-grant to authenticated only
REVOKE EXECUTE ON FUNCTION public.request_deposit(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_deposit(uuid, numeric, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.request_withdrawal(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(uuid, numeric, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.invest_in_plan(uuid, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invest_in_plan(uuid, uuid, numeric) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.client_swap(uuid, uuid, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_swap(uuid, uuid, numeric, numeric) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.client_request_deposit_address(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_request_deposit_address(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_process_deposit(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_process_deposit(uuid, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_review_kyc(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_kyc(uuid, boolean, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, uuid, numeric, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, date, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, date, text, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_set_deposit_address(uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_deposit_address(uuid, text, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_update_currency_price(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_currency_price(uuid, numeric) TO authenticated;

-- has_role is used inside RLS; keep executable but lock from anon (RLS runs as function owner regardless)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Trigger-only functions: revoke from PUBLIC entirely
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_profile_kyc() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_transaction_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_ticket_message() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_assign_ticket() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
