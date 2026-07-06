import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import "@/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Back home
        </Link>

      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocorreu um erro inesperado. Tente novamente ou volte ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Tentar novamente
          </button>
          <a href="/" className="rounded-md border border-border bg-surface px-4 py-2 text-sm hover:bg-surface-elevated">
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MetaLock — Secure crypto vault with identity-locked transfers" },
      { name: "description", content: "MetaLock is a security-first crypto platform. Send and receive only from wallets registered to your own verified identity — even a stolen password cannot move your funds." },
      { name: "author", content: "MetaLock" },
      { property: "og:title", content: "MetaLock — Secure crypto vault with identity-locked transfers" },
      { property: "og:description", content: "MetaLock is a security-first crypto platform. Send and receive only from wallets registered to your own verified identity — even a stolen password cannot move your funds." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "MetaLock" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "MetaLock — Secure crypto vault with identity-locked transfers" },
      { name: "twitter:description", content: "MetaLock is a security-first crypto platform. Send and receive only from wallets registered to your own verified identity — even a stolen password cannot move your funds." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/78b3994d-3ae5-49da-9b6b-d9edc7850a66/id-preview-ea4f44cc--fd982da1-5040-4894-8ad3-ca17e203409c.lovable.app-1783296080008.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/78b3994d-3ae5-49da-9b6b-d9edc7850a66/id-preview-ea4f44cc--fd982da1-5040-4894-8ad3-ca17e203409c.lovable.app-1783296080008.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://rsms.me/" },
      { rel: "stylesheet", href: "https://rsms.me/inter/inter.css" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
