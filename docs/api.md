# API Surface

## Server functions (typed RPC)

Server functions live next to the feature they serve, in files
suffixed `.functions.ts`. Examples in this repo:

- `src/lib/prices.functions.ts` — CoinGecko price proxy (avoids
  browser CORS + rate limits).

Rules:

- Read secrets inside the `.handler()` body, never at module scope.
- Protected functions add `.middleware([requireSupabaseAuth])`.
- Never call a protected function from a public route's `loader`
  (SSR prerender has no bearer token). Use `useServerFn` inside a
  component instead.

Call from the client:

```tsx
import { useServerFn } from "@tanstack/react-start";
import { getPrices } from "@/lib/prices.functions";

const fetchPrices = useServerFn(getPrices);
const { data } = useQuery({ queryKey: ["prices"], queryFn: () => fetchPrices({ data: { ids: [...] } }) });
```

## Server routes (raw HTTP)

Located under `src/routes/api/*` when needed. Use for:

- Webhooks with signature verification.
- Public read-only endpoints (health checks).
- Cron endpoints (`src/routes/api/public/*` — bypasses auth on
  the published site; you MUST verify the caller in-handler).

## Sitemap

`src/routes/sitemap[.]xml.ts` is a server route emitting
`/sitemap.xml` at request time. Extend its `entries` array when
adding new public routes.

## Edge functions (Supabase)

None are shipped in this repository. If you need one, place it
under `supabase/functions/<name>/index.ts` and deploy with
`supabase functions deploy <name>`.
