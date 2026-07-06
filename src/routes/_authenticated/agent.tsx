import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Headphones, Users, LogOut, Menu, X, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/agent")({
  component: AgentLayout,
});

function AgentLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const nav = [
    { to: "/agent", label: t("nav.dashboard"), icon: LayoutDashboard, exact: true },
    { to: "/agent/transactions", label: t("nav.transactions"), icon: Users },
    { to: "/agent/kyc", label: "KYC", icon: Users },
    { to: "/agent/tickets", label: t("support.title"), icon: Headphones },
  ];

  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const { data: roleCheck, isLoading } = useQuery({
    queryKey: ["is-agent-or-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role");
      const roles = (data ?? []).map((r) => r.role);
      return { ok: roles.includes("agent") || roles.includes("admin") };
    },
  });

  useEffect(() => {
    if (!isLoading && roleCheck && !roleCheck.ok) {
      toast.error(t("agent.restricted"));
      navigate({ to: "/dashboard" });
    }
  }, [isLoading, roleCheck, navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  if (isLoading || !roleCheck?.ok) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">{t("agent.verifying")}</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-border bg-sidebar transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <img src="/favicon.png" alt="MetaLock" className="h-8 w-8 rounded-sm" />
          <div>
            <div className="text-sm font-bold leading-tight">MetaLock</div>
            <div className="text-[10px] uppercase tracking-widest text-primary">{t("support.title")}</div>
          </div>
        </div>
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
          <div className="text-sm text-muted-foreground hidden lg:block">{t("agent.panel")}</div>
          <div className="flex items-center gap-2"><LanguageSwitcher /><NotificationBell /></div>
        </header>
        <main className="flex-1 p-6"><Outlet /></main>
      </div>
    </div>
  );
}
