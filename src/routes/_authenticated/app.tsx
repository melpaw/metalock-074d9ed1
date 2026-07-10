import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Layers, LifeBuoy, LogOut, Menu, X, UserRound, LineChart, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<{ name: string; email: string; avatar_url: string | null } | null>(null);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles")
        .select("full_name,email,avatar_url,locale")
        .eq("id", data.user.id).maybeSingle();
      if (p) {
        setMe({ name: (p as any).full_name || (p as any).email, email: (p as any).email, avatar_url: (p as any).avatar_url });
        if ((p as any).locale && (p as any).locale !== i18n.language.slice(0, 2)) i18n.changeLanguage((p as any).locale);
      }
    });
  }, [i18n]);

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

  return (
    <div className="flex min-h-screen">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-foreground/8 bg-white/70 backdrop-blur-xl transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center gap-2 border-b border-foreground/8 px-6">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background">
            <img src="/favicon.png" alt="MetaLock" className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">MetaLock</div>
            <div className="text-[10px] uppercase tracking-widest text-indigo-600">{t("nav.clientArea")}</div>
          </div>
        </div>

        <Link to="/app/profile" onClick={() => setOpen(false)}
          className={`mx-3 mt-3 flex items-center gap-3 rounded-2xl border border-foreground/8 bg-white/60 p-3 transition hover:bg-white ${pathname.startsWith("/app/profile") ? "ring-2 ring-indigo-500/40" : ""}`}>
          {me?.avatar_url
            ? <img src={me.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            : <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-rose-500 text-sm font-bold text-white">{initials}</div>}
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
                className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition ${
                  active
                    ? "bg-foreground text-background font-semibold shadow-[0_6px_20px_-8px_oklch(0.14_0.01_260/0.45)]"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                }`}>
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-foreground/8 p-3">
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> {t("common.logout")}
          </Button>
        </div>
      </aside>
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-foreground/40 backdrop-blur-sm lg:hidden" />}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-foreground/8 bg-white/60 px-6 backdrop-blur-xl">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="text-sm font-medium text-muted-foreground hidden lg:block">{t("nav.clientArea")}</div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
