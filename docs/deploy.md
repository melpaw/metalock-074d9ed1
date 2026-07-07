# Deploy

The application is a TanStack Start app targeting the
**Cloudflare Workers** runtime (Nitro preset baked into the Vite
config). Plain Cloudflare Pages static hosting is **not** enough —
the app needs the Worker runtime to serve SSR and server functions.

## Option 1 — Cloudflare Workers via `wrangler`

1. `npm install -g wrangler` (once).
2. `npm run build` — outputs `.output/` with a Worker bundle.
3. Create `wrangler.toml` at repo root:

   ```toml
   name = "metalock"
   main = ".output/server/index.mjs"
   compatibility_date = "2025-01-01"
   compatibility_flags = ["nodejs_compat"]

   [assets]
   directory = ".output/public"
   binding = "ASSETS"
   ```

4. Push secrets:

   ```bash
   wrangler secret put SUPABASE_URL
   wrangler secret put SUPABASE_PUBLISHABLE_KEY
   wrangler secret put SUPABASE_PROJECT_ID
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # only if used
   ```

   Public `VITE_*` values must be present at build time (in `.env`
   or via CI env), not as Worker secrets, because Vite inlines them.

5. `wrangler deploy`.

## Option 2 — Cloudflare Pages with Functions

Cloudflare Pages can host a Worker-backed app via Pages Functions.
Point the build command at `npm run build` and the output directory
at `.output/public`, then upload `.output/server/index.mjs` as a
`_worker.js`-style function. Follow the Cloudflare Pages docs for
your account.

## Option 3 — Any Workers-compatible host

Netlify Edge Functions, Deno Deploy, Vercel Edge — the build
output is a standard Web Fetch handler and runs on any of them
provided `nodejs_compat` (or equivalent) is enabled.

## Environment matrix

| Variable | Local | Build server | Runtime (Worker) |
| -------- | ----- | ------------ | ---------------- |
| `VITE_*` | `.env` | build env | inlined at build |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` | `.env` | build env | Worker env / secret |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` (optional) | — | Worker secret |

## Custom domain

Attach the domain in Cloudflare dashboard and update:

- `src/routes/__root.tsx` — `og:image` absolute URL if you use one.
- `src/routes/index.tsx` — canonical / og:url values.
- `src/routes/sitemap[.]xml.ts` — `BASE_URL`.
- `public/robots.txt` — `Sitemap:` line.

A future `VITE_SITE_URL` variable can centralise these; left as a
follow-up so no functionality changes here.
