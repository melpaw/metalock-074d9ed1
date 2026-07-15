import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Layers, LifeBuoy, LogOut, Menu, X, UserRound, LineChart, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { applyClientLanguage, LANG_STORAGE_KEY } from "@/i18n";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [languageReady, setLanguageReady] = useState(false);
  const [me, setMe] = useState<{ name: string; email: string; avatar_url: string | null } | null>(null);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        if (!cancelled) setLanguageReady(true);
        return;
      }
      const { data: p } = await supabase.from("profiles")
        .select("full_name,email,avatar_url,locale")
        .eq("id", data.user.id).maybeSingle();
      if (cancelled) return;
      if (p) {
        setMe({ name: (p as any).full_name || (p as any).email, email: (p as any).email, avatar_url: (p as any).avatar_url });
        await applyClientLanguage((p as any).locale || localStorage.getItem(LANG_STORAGE_KEY), Boolean((p as any).locale));
      }
      if (!cancelled) setLanguageReady(true);
    }).catch(() => {
      if (!cancelled) setLanguageReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  const nav = [
    { to: "/app", label: t("nav.overview"), icon: LayoutDashboard, exact: true },
    { to: "/app/market", label: t("nav.market"), icon: LineChart },
    { to: "/app/wallets", label: t("nav.wallets"), icon: Wallet },
    { to: "/app/invest", label: t("nav.plans"), icon: Layers },
    { to: "/app/support", label: t("nav.support"), icon: LifeBuoy },
  ];

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  const initials = (me?.name || me?.email || "U").slice(0, 2).toUpperCase();

  if (!languageReady) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-border bg-sidebar transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <img src="/favicon.png" alt="MetaLock" className="h-8 w-8 rounded-sm" />
          <div>
            <div className="text-sm font-bold leading-tight">MetaLock</div>
            <div className="text-[10px] uppercase tracking-widest text-primary">{t("nav.clientArea")}</div>
          </div>
        </div>

        <Link to="/app/profile" onClick={() => setOpen(false)}
          className={`mx-3 mt-3 flex items-center gap-3 rounded-sm border border-border bg-surface p-3 transition hover:bg-surface-elevated ${pathname.startsWith("/app/profile") ? "ring-1 ring-primary" : ""}`}>
          {me?.avatar_url
            ? <img src={me.avatar_url} alt="" className="h-10 w-10 rounded-sm object-cover" />
            : <div className="grid h-10 w-10 place-items-center rounded-sm gradient-primary text-sm font-bold text-primary-foreground">{initials}</div>}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{me?.name ?? "..."}</div>
            <div className="truncate text-[11px] text-muted-foreground">{t("nav.profile")}</div>
          </div>
          <UserRound className="h-4 w-4 text-muted-foreground" />
        </Link>

        <nav className="p-3 space-y-1">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  active ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}>
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-3">
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> {t("common.logout")}
          </Button>
        </div>
      </aside>
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/50 lg:hidden" />}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="text-sm text-muted-foreground hidden lg:block">{t("nav.clientArea")}</div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 p-6"><Outlet /></main>
      </div>
    </div>
  );
}
