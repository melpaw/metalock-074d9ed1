# Environment Variables

See `.env.example` for the copy-paste template.

| Variable | Scope | Required | Read by | Notes |
| -------- | ----- | -------- | ------- | ----- |
| `VITE_SUPABASE_URL` | browser + SSR | ✅ | `src/integrations/supabase/client.ts` | Full `https://<ref>.supabase.co` URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser + SSR | ✅ | `client.ts` | Anon key. Safe to ship publicly. |
| `VITE_SUPABASE_PROJECT_ID` | browser + SSR | ✅ | generated auth attacher | Project ref only. |
| `SUPABASE_URL` | server | ✅ | `client.server.ts` | Same URL as VITE_. |
| `SUPABASE_PUBLISHABLE_KEY` | server | ✅ | server middleware | Anon key. |
| `SUPABASE_PROJECT_ID` | server | ✅ | server helpers | Project ref. |
| `SUPABASE_SERVICE_ROLE_KEY` | server | optional* | `client.server.ts` (`supabaseAdmin`) | *Required if any server function uses `supabaseAdmin`. Never expose to the browser. Not needed to run the UI on Lovable Cloud (injected there). |
| `VITE_SITE_URL` | browser + SSR | optional | future canonical helpers | Currently the domain is hardcoded to `https://metalock.lovable.app`. Set this when moving to a custom domain. |

## Where they come from

- **Lovable Cloud (default)**: `.env` is populated automatically
  with the project's Supabase credentials. `SUPABASE_SERVICE_ROLE_KEY`
  is injected into the runtime but not printed.
- **Off-platform**: create a Supabase project, copy the anon key
  and project URL from Dashboard → Project Settings → API, and
  fill `.env` from `.env.example`.

## Loading rules

- Vite injects any `VITE_*` variable into the client bundle at
  build time via `import.meta.env`.
- Non-prefixed variables are available only to server code via
  `process.env.*`. Reading them at module scope of a client-imported
  file returns `undefined` — always read inside a handler.
