# Local Installation

## Requirements

- Node.js ≥ 20 (LTS)
- npm ≥ 10 (or `bun` / `pnpm` — the repo ships a `bun.lock` but is
  compatible with npm)
- A Supabase project (self-hosted or hosted)

## Steps

```bash
# 1. Clone and install
git clone <your-fork-url> metalock
cd metalock
npm install

# 2. Configure environment
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
# VITE_SUPABASE_PROJECT_ID (and the SUPABASE_* server duplicates).

# 3. Apply the database schema
#    Option A — Supabase CLI (recommended):
supabase link --project-ref <your-ref>
supabase db push
psql "$SUPABASE_DB_URL" -f supabase/seed.sql   # dev only
#    Option B — copy migrations into the SQL Editor and run in order.

# 4. Run
npm run dev
# Vite dev server on http://localhost:8080
```

## First admin

New signups get the `user` role by default. Promote one manually:

```sql
insert into public.user_roles (user_id, role)
values ('<uuid-from-auth.users>', 'admin');
```

## Available scripts

| Script | Purpose |
| ------ | ------- |
| `npm run dev` | Vite dev server with HMR. |
| `npm run build` | Production build (Cloudflare Worker output under `.output/`). |
| `npm run build:dev` | Development-mode build (unminified, source maps). |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | ESLint over `src/`. |
| `npm run format` | Prettier over the whole repo. |
| `npm run typecheck` | `tsc --noEmit` for a quick type gate. |
