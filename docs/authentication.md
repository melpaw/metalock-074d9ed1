# Authentication

Supabase Auth (GoTrue) with email + password. Google OAuth is
wired in the client but requires the provider to be enabled in
Supabase Dashboard → Authentication → Providers before use.

## Flow

1. `src/routes/auth.tsx` renders login / signup / forgot forms.
2. On submit it calls `supabase.auth.signInWithPassword` /
   `signUp` / `resetPasswordForEmail` from the browser client.
3. GoTrue returns a session; `@supabase/supabase-js` stores it in
   `localStorage` and refreshes tokens automatically.
4. `src/routes/__root.tsx` subscribes to `onAuthStateChange` and
   invalidates router + query caches on `SIGNED_IN` / `SIGNED_OUT`.
5. Any route under `src/routes/_authenticated/` runs the gate in
   `src/routes/_authenticated/route.tsx`, which calls
   `supabase.auth.getUser()` in `beforeLoad` and redirects to
   `/auth` if there is no session.

## Password reset

`/reset-password` handles the deep link Supabase emails. It reads
the recovery token from the URL fragment, calls
`supabase.auth.updateUser({ password })`, then routes to `/auth`.

## Server-side authorization

Server functions that read/write on behalf of the user use
`requireSupabaseAuth` middleware:

```ts
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const doThing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // supabase client is scoped to the caller; RLS applies as that user.
  });
```

The middleware requires `attachSupabaseAuth` to run client-side —
it is registered in `src/start.ts` under `functionMiddleware`.
Removing it results in `Unauthorized: No authorization header
provided` on every protected server function.

## Session storage

- Browser: `localStorage` (managed by `@supabase/supabase-js`).
- SSR: the bearer token is forwarded per-request via
  `attachSupabaseAuth`; there is no shared cookie session.

## Never do this

- Do not check admin status from `localStorage` or a client-side
  flag. Use `has_role(auth.uid(), 'admin')` in RLS and/or a
  server function.
- Do not add columns like `role` or `is_admin` on `profiles` —
  roles live in `user_roles`.
