# Database

The entire schema is versioned as SQL migrations in
`supabase/migrations/`. A fresh database is reproduced by:

```bash
supabase db reset          # local (drops + reapplies all migrations + seed.sql)
# or
supabase db push           # apply pending migrations to a linked project
```

## Core tables (public schema)

| Table               | Purpose |
| ------------------- | ------- |
| `profiles`          | 1:1 with `auth.users`. Holds display name, locale, avatar, KYC status. |
| `user_roles`        | Role assignments (`admin`, `agent`, `user`). Never store roles on `profiles`. |
| `currencies`        | Supported assets (crypto + fiat). Includes `usd_price` fallback. |
| `wallets`           | Per-user balance rows keyed by `(user_id, currency_id)`. |
| `transactions`      | Deposits, withdrawals, transfers, adjustments. State machine drives balance updates. |
| `investment_plans`  | Reference table of yield products. |
| `investments`       | User subscriptions to plans (amount, lock end, accrued). |
| `kyc_documents`     | Uploaded ID docs pending admin review. |
| `tickets`           | Support conversation threads. |
| `ticket_messages`   | Individual messages inside a ticket. |
| `notifications`     | In-app notification bell feed. |
| `audit_logs`        | Append-only admin action log. |

Column-level detail lives in the migration files themselves and in
the generated `src/integrations/supabase/types.ts`.

## Enums

- `app_role` — `admin | agent | user`.
- `transaction_type`, `transaction_status`, `kyc_status`, etc. —
  defined in the migrations that introduce the parent table.

## Row-Level Security

RLS is **enabled on every public table** and enforced with policies
that read from `user_roles` via the security-definer helper:

```sql
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;
```

Typical policy shapes:

- `select` own row: `using (auth.uid() = user_id)`
- admin-wide: `using (public.has_role(auth.uid(), 'admin'))`
- agent read + limited write: `using (public.has_role(auth.uid(), 'agent'))`

## Grants

Every `public.*` table used by the Data API carries explicit
grants — Supabase does not grant them by default:

```sql
grant select, insert, update, delete on public.<table> to authenticated;
grant all on public.<table> to service_role;
-- and, only for fully public rows:
grant select on public.<table> to anon;
```

## RPCs and triggers

- `public.has_role(uuid, app_role)` — security-definer role check.
- Balance-mutating operations run through triggers on
  `transactions`; see the migration files for exact bodies.
- `updated_at` timestamps are maintained by a shared trigger
  function `public.set_updated_at()`.

## Storage buckets

Managed through Supabase Dashboard → Storage. The application uses:

- `avatars` — public read, authenticated write (own user prefix).
- `kyc` — private, service-role only (admin review).

Bucket creation is not versioned in migrations; recreate them
manually or via the Supabase CLI when bootstrapping a new project.

## Seed data

`supabase/seed.sql` upserts baseline `currencies` and
`investment_plans` for local development. It is idempotent and
safe to re-run.
