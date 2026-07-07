# MetaLock — Documentation Index

This folder is the single source of truth for anyone who wants to
run, extend, deploy or hand off the MetaLock codebase without
depending on the Lovable web IDE.

| Doc | Purpose |
| --- | --- |
| [architecture.md](./architecture.md) | High-level system overview, request lifecycle, tech stack. |
| [folder-structure.md](./folder-structure.md) | Every top-level folder and what belongs there. |
| [database.md](./database.md) | Tables, enums, RPCs, triggers, RLS strategy. |
| [authentication.md](./authentication.md) | Sign-in flow, session handling, SSR bearer, reset password. |
| [permissions.md](./permissions.md) | Roles, `has_role()`, admin/agent scoping. |
| [wallets-and-finance.md](./wallets-and-finance.md) | Wallet lifecycle and transaction flow. |
| [api.md](./api.md) | Server functions, public API routes, edge functions. |
| [env.md](./env.md) | Every environment variable, where it is read, what happens if missing. |
| [install.md](./install.md) | Local install, `npm run dev`, first login. |
| [deploy.md](./deploy.md) | Cloudflare Workers deployment via `wrangler`. |
| [backup-and-recovery.md](./backup-and-recovery.md) | Backups, PITR, disaster recovery. |
| [maintenance.md](./maintenance.md) | Upgrades, migrations, secret rotation, monitoring. |

For migration off Lovable specifically, see
[`../MIGRATION_CHECKLIST.md`](../MIGRATION_CHECKLIST.md).
