# Maintenance

## Adding a migration

```bash
supabase migration new <descriptive_name>
# edit the generated .sql — remember GRANTs + ENABLE RLS + policies
supabase db reset            # verify locally
supabase db push             # apply to the linked remote
```

Never edit an existing migration file that has already been
applied to a shared database; write a new one instead.

## Regenerating types

```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

On Lovable Cloud this file regenerates automatically on schema
change. Off-platform, run the command above after each migration.

## Upgrading dependencies

```bash
npm outdated
npm update <package>
npm run typecheck && npm run build   # verify nothing broke
```

Pin `@tanstack/*` to compatible versions — router, start, and
router-plugin must move together.

## Rotating secrets

- **Supabase anon key**: Dashboard → Project Settings → API → Reset.
  Update `.env` and redeploy.
- **Service role key**: same place. Update Worker secret with
  `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`.
- **User passwords**: reset via `/reset-password` flow.

## Monitoring

- Supabase Dashboard → Logs → PostgREST / Auth for API-level errors.
- Cloudflare Dashboard → Workers → Logs (live tail) for SSR errors.
- Client-side errors surface through the `ErrorComponent` in
  `src/routes/__root.tsx`. Wire an APM (Sentry, PostHog, etc.) by
  replacing `reportLovableError` in `src/lib/lovable-error-reporting.ts`.

## Common pitfalls

- Forgetting `GRANT` on a new public table → 401/permission errors
  in the browser even with RLS policies in place.
- Adding a protected server function to a public route `loader`
  → `Unauthorized` during SSR prerender / build.
- Removing `attachSupabaseAuth` from `src/start.ts` → every
  protected server function fails with "No authorization header".
