import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserCircle2, Coins as CoinsIcon, Headphones, Circle, ArrowUpRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getMarketPrices } from "@/lib/prices.functions";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CryptoIcon } from "@/components/CryptoIcon";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");

  const { data: kpis } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: async () => {
      const [users, roles, tickets] = await Promise.all([
        supabase.from("profiles").select("id, created_at, status"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("support_tickets").select("id, status").in("status", ["open", "pending"]),
      ]);
      const usersData = users.data ?? [];
      const rolesData = roles.data ?? [];
      const clientIds = new Set(rolesData.filter((r) => r.role === "client").map((r) => r.user_id));
      return {
        totalUsers: usersData.length,
        totalClients: clientIds.size,
        activeUsers: usersData.filter((u) => u.status === "active").length,
        openTickets: tickets.data?.length ?? 0,
        newSignups7d: last7DaysBuckets(usersData.map((u) => u.created_at)),
      };
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["admin-clients-compact"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "client");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("profiles").select("id,email,full_name,status,kyc_status,created_at").in("id", ids).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const fetchPrices = useServerFn(getMarketPrices);
  const { data: prices } = useQuery({
    queryKey: ["market-prices"],
    queryFn: () => fetchPrices({ data: { ids: ["bitcoin", "ethereum", "solana", "binancecoin", "ripple", "cardano"] } }),
    refetchInterval: 60_000,
    staleTime: 55_000,
  });

  const filtered = (clients ?? []).filter((c: any) =>
    !search || c.email?.toLowerCase().includes(search.toLowerCase()) || c.full_name?.toLowerCase().includes(search.toLowerCase())
  );
  const newSignups = kpis?.newSignups7d?.reduce((s: number, d: any) => s + d.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("admin.dashboard")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.dashboardSubtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Link to="/admin/clients" className="block group">
          <div className="rounded-xl border border-border bg-surface p-5 transition group-hover:border-primary group-hover:bg-surface-elevated">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <div className="min-w-0">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.clients")}</span>
                <div className="mt-3 flex items-end gap-3">
                  <span className="text-3xl font-bold tabular-nums">{kpis?.totalClients ?? "—"}</span>
                  <span className="pb-1 text-xs text-up tabular-nums">+{newSignups} · {t("admin.newSignupsShort")}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{t("admin.activeUsersShort", { active: kpis?.activeUsers ?? 0 })}</div>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <UserCircle2 className="h-5 w-5" />
              </div>
            </div>
          </div>
        </Link>
        <Link to="/admin/tickets" className="block group">
          <div className="rounded-xl border border-border bg-surface p-5 transition group-hover:border-primary group-hover:bg-surface-elevated">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <div className="min-w-0">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.support")}</span>
                <div className="mt-3 text-3xl font-bold tabular-nums">{kpis?.openTickets ?? "—"}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t("admin.supportHint")}</div>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Headphones className="h-5 w-5" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      <section className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-5 py-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-semibold">{t("admin.clients")}</h2>
            <p className="text-xs text-muted-foreground">{clients?.length ?? 0} · {t("admin.clientsHint", { active: kpis?.activeUsers ?? 0 })}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Input placeholder={t("admin.searchClient")} value={search} onChange={(e) => setSearch(e.target.value)} className="w-44 sm:w-64" />
            <Link to="/admin/clients" className="hidden text-xs text-primary hover:underline sm:inline">{t("admin.seeAllClients")}</Link>
          </div>
        </div>
        {!clients ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{t("admin.noClient")}</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.slice(0, 10).map((c: any) => (
              <Link key={c.id} to="/admin/clients/$userId" params={{ userId: c.id }} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-5 py-3 transition hover:bg-surface-elevated">
                <div className="grid h-9 w-9 place-items-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
                  {(c.full_name || c.email || "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-sm">{c.full_name || c.email?.split("@")[0]}</span>
                    <Circle className={`h-2 w-2 ${c.status === "active" ? "text-up fill-up" : c.status === "frozen" ? "text-warning fill-warning" : "text-down fill-down"}`} />
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                </div>
                <KycBadge status={c.kyc_status} t={t} />
                <span className="text-xs text-muted-foreground tabular-nums hidden sm:block">
                  {new Date(c.created_at).toLocaleDateString(i18n.language)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <CoinsIcon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{t("admin.liveMarket")}</h3>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {prices?.data ? (
            Object.entries(prices.data).map(([id, p]: [string, any]) => (
              <div key={id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-surface-elevated/45 px-3 py-3 transition hover:border-primary/50">
                <CryptoIcon id={id} className="h-10 w-10" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold capitalize">{marketName(id)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{marketSymbol(id)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums">${p.usd?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  <div className={`flex items-center justify-end gap-1 text-xs tabular-nums ${p.usd_24h_change >= 0 ? "text-up" : "text-down"}`}>
                    <ArrowUpRight className={`h-3 w-3 ${p.usd_24h_change < 0 ? "rotate-90" : ""}`} />
                    {p.usd_24h_change >= 0 ? "+" : ""}{p.usd_24h_change?.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          )}
        </div>
      </section>
    </div>
  );
}

const MARKET_META: Record<string, { name: string; symbol: string }> = {
  bitcoin: { name: "Bitcoin", symbol: "BTC" },
  ethereum: { name: "Ethereum", symbol: "ETH" },
  solana: { name: "Solana", symbol: "SOL" },
  binancecoin: { name: "BNB", symbol: "BNB" },
  ripple: { name: "XRP", symbol: "XRP" },
  cardano: { name: "Cardano", symbol: "ADA" },
};

function marketName(id: string) {
  return MARKET_META[id]?.name ?? id.replaceAll("-", " ");
}

function marketSymbol(id: string) {
  return MARKET_META[id]?.symbol ?? id.slice(0, 4).toUpperCase();
}

function KycBadge({ status, t }: { status: string | null; t: (key: string) => string }) {
  const s = status ?? "not_started";
  const map: Record<string, string> = {
    approved: "bg-up/15 text-up border-up/30",
    pending: "bg-warning/15 text-warning border-warning/30",
    rejected: "bg-down/15 text-down border-down/30",
    not_started: "bg-muted/30 text-muted-foreground border-border",
  };
  const label: Record<string, string> = {
    approved: t("admin.kycOk"),
    pending: t("admin.kycPending"),
    rejected: t("admin.kycRejected"),
    not_started: t("admin.noKyc"),
  };
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium ${map[s]}`}>{label[s]}</span>;
}

function last7DaysBuckets(dates: string[]) {
  const days: { day: string; count: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ day: d.toLocaleDateString("pt-BR", { weekday: "short" }), count: 0 });
    (days[days.length - 1] as any)._key = key;
  }
  dates.forEach((iso) => {
    const key = iso.slice(0, 10);
    const b = days.find((x: any) => x._key === key);
    if (b) b.count++;
  });
  return days;
}
