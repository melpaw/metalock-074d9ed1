
REVOKE EXECUTE ON FUNCTION public.admin_add_transaction(uuid, tx_type, uuid, numeric, text, text, text, text, boolean, timestamptz, boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_process_deposit(uuid, boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid, boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_register_client(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, uuid, numeric, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_transaction(uuid, text, text, boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_currency_price(uuid, numeric) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, date, text, text, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_review_kyc(uuid, boolean, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_deposit_address(uuid, text, text, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_insurance_quote(uuid, numeric) FROM authenticated;
