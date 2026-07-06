
-- Re-grant EXECUTE to authenticated on functions the app calls from the client.
-- Each function still enforces role checks internally via has_role().
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_my_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_agent_display_name(text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_add_transaction(uuid, public.tx_type, uuid, numeric, text, text, text, text, boolean, timestamptz, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_process_deposit(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_register_client(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_insurance_quote(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_deposit_address(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_transaction(uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_currency_price(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, date, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_kyc(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_process_swap(uuid, boolean) TO authenticated;

-- Keep anon/PUBLIC revoked (already done in prior migration). Ensure it stays that way:
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_my_client(uuid) FROM PUBLIC, anon;
