# Backup and Recovery

## Backups

- **Supabase daily backups**: enabled automatically on paid plans.
  Retention depends on your Supabase tier. Verify under Dashboard
  → Database → Backups.
- **Point-in-Time Recovery (PITR)**: opt-in per Supabase project
  (paid feature). Recommended for production.
- **Application code**: lives in Git. Push to GitHub (or any git
  remote) after every meaningful change; the Git history *is* the
  code backup.
- **Storage buckets**: back up out-of-band with
  `supabase storage cp` or scripted `s3` sync. Not covered by
  Postgres backups.

## Manual snapshot (dev / hand-off)

```bash
# Structure + data of the public schema:
supabase db dump --schema public -f backup-$(date +%F).sql

# Schema only (useful when handing off without user data):
supabase db dump --schema public --data=false -f schema-$(date +%F).sql
```

## Restore

1. Provision a fresh Supabase project.
2. Apply migrations: `supabase db push` (from a clone of this repo
   linked with `supabase link --project-ref <new-ref>`).
3. Restore data:
   - From Supabase-managed backup: use the Dashboard → Backups
     restore flow.
   - From a `.sql` dump: `psql "$SUPABASE_DB_URL" -f backup.sql`.
4. Recreate storage buckets (`avatars`, `kyc`) and re-upload
   files from your storage backup.
5. Update `.env` to point at the new project, redeploy the Worker.

## Verifying a restore

- Sign in as the seeded admin.
- Confirm `wallets`, `transactions`, `kyc_documents` counts match
  the pre-restore export.
- Trigger a no-op admin action to confirm RLS + `has_role()` still
  work end-to-end.
