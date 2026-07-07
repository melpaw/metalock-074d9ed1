# Architecture

## Stack

| Layer          | Technology |
| -------------- | ---------- |
| UI             | React 19, Tailwind CSS v4, shadcn/ui, Radix primitives |
| Routing / SSR  | TanStack Start v1 (file-based routes in `src/routes/`) |
| Data fetching  | TanStack Query, `createServerFn` (typed RPC) |
| Backend        | Supabase (Postgres, Auth, Storage, Edge Functions) |
| i18n           | i18next (PT / EN / DE) |
| Build          | Vite 7 |
| Runtime target | Cloudflare Workers (via Nitro preset) |
| Hosting        | Cloudflare Workers/Pages Functions or any Workers-compatible host |

## Request lifecycle

1. Browser hits Cloudflare Worker (`src/server.ts`).
2. Worker imports `@tanstack/react-start/server-entry` and delegates.
3. TanStack Start matches a file route in `src/routes/`, runs any
   `loader`, renders on the server, streams HTML.
4. Client hydrates; TanStack Router takes over navigation.
5. Data mutations go through `createServerFn` (RPC) or Supabase
   client directly for browser-only reads/subscriptions.

## Data path

- **Public reads with RLS** → browser Supabase client
  (`src/integrations/supabase/client.ts`) using the anon key.
- **Authenticated writes / server-side reads** → server function
  with `.middleware([requireSupabaseAuth])`
  (`src/integrations/supabase/auth-middleware.ts`). The middleware
  reads the bearer token attached by `attachSupabaseAuth`
  (`src/start.ts`) and produces a Supabase client scoped to the
  caller.
- **Privileged jobs (bypass RLS)** → `supabaseAdmin` from
  `src/integrations/supabase/client.server.ts`. Must be imported
  inside a handler body, never at module scope of a client-imported
  file.

## Where things live at runtime

- Static assets → Cloudflare edge cache.
- SSR + server functions → Cloudflare Worker (`src/server.ts`
  entry, wraps TanStack's SSR entry with error normalisation).
- Database, auth, storage → Supabase (Postgres + PostgREST + GoTrue).
