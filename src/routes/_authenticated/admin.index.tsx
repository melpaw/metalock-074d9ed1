import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Coins, ChevronRight, Shield, MessageSquare, Circle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CryptoIcon } from "@/components/CryptoIcon";
import { useServerFn } from "@tanstack/react-start";
import { getMarketPrices } from "@/lib/prices.functions";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");

  const { data: counts } = useQuery({
    queryKey: ["admin-counts"],
    queryFn: async () => {
      const [txs, kyc, tickets] = await Promise.all([
        supabase.from("transactions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("kyc_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "pending"]),
      ]);
      return { txs: txs.count ?? 0, kyc: kyc.count ?? 0, tickets: tickets.count ?? 0 };
    },
    refetchInterval: 20000,
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
  });

  const filtered = (clients ?? []).filter((c: any) =>
    !search || c.email?.toLowerCase().includes(search.toLowerCase()) || c.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("admin.dashboard")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.dashboardSubtitle")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <QueueCard to="/admin/transactions" title="Transações pendentes" value={counts?.txs ?? 0} icon={Coins} tone="warning" />
        <QueueCard to="/admin/kyc" title="KYC pendentes" value={counts?.kyc ?? 0} icon={Shield} tone="primary" />
        <QueueCard to="/admin/tickets" title="Chats pendentes" value={counts?.tickets ?? 0} icon={MessageSquare} tone="down" />
      </div>

      <section className="rounded-sm border border-border bg-surface overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-semibold">{t("admin.clients")}</h2>
            <p className="text-xs text-muted-foreground">{clients?.length ?? 0} total</p>
          </div>
          <div className="flex items-center gap-3">
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
            {filtered.slice(0, 8).map((c: any) => (
              <Link key={c.id} to="/admin/clients/$userId" params={{ userId: c.id }} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-5 py-3 transition hover:bg-surface-elevated">
                <div className="grid h-9 w-9 place-items-center rounded-sm gradient-primary text-xs font-bold text-primary-foreground">
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

      <section className="rounded-sm border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{t("admin.liveMarket")}</h3>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {prices?.data ? (
            Object.entries(prices.data).map(([id, p]: [string, any]) => (
              <div key={id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-sm border border-border bg-surface-elevated/45 px-3 py-3">
                <CryptoIcon id={id} className="h-10 w-10" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold capitalize">{id.replaceAll("-", " ")}</div>
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

function QueueCard({ to, title, value, icon: Icon, tone }: { to: any; title: string; value: number; icon: any; tone: "warning" | "primary" | "down" }) {
  const toneMap = {
    warning: "border-warning/30 text-warning bg-warning/10",
    primary: "border-primary/30 text-primary bg-primary/10",
    down: "border-down/30 text-down bg-down/10",
  };
  return (
    <Link to={to} className="group rounded-sm border border-border bg-surface p-4 transition hover:border-primary hover:bg-surface-elevated">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</div>
          <div className="mt-1 text-3xl font-black tabular-nums">{value}</div>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-sm border ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-70 group-hover:opacity-100">
        Abrir fila <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

function KycBadge({ status, t }: { status: string | null; t: (k: string) => string }) {
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
  return <span className={`inline-flex rounded-sm border px-2 py-0.5 text-[10px] font-medium ${map[s]}`}>{label[s]}</span>;
}
