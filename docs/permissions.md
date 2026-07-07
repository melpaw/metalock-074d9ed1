# Permissions

Three roles are recognised, stored in `public.user_roles`:

| Role    | Access |
| ------- | ------ |
| `user`  | Own profile, wallets, transactions, tickets. Default for new signups. |
| `agent` | Read all clients + queues (KYC, tickets, transactions), limited write. Uses the same `/admin/*` routes as admin, gated by role. |
| `admin` | Full read/write on every table, including role management. |

## How it is enforced

- **Database**: every table policy references
  `public.has_role(auth.uid(), 'admin' | 'agent' | 'user')`.
- **UI**: `src/routes/_authenticated/admin.tsx` and
  `agent.tsx` check the caller's role before rendering; a mismatched
  role is redirected to `/app`.
- **Server functions**: use `requireSupabaseAuth` for identity,
  then re-check the role explicitly inside the handler for any
  destructive action (`has_role(userId, 'admin')`).

## Granting roles

Roles are assigned by an existing admin through the admin UI or
by a direct insert (bootstrap only):

```sql
insert into public.user_roles (user_id, role)
values ('<uuid-of-first-admin>', 'admin');
```

There is no self-service role escalation. Never trust a role read
from the browser without re-checking it server-side.
