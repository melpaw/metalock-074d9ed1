import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, ArrowDownToLine, ArrowUpToLine, Coins as CoinsIcon, UserCircle2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useServerFn } from "@tanstack/react-start";
import { getMarketPrices } from "@/lib/prices.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: kpis } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: async () => {
      const [users, roles, tx] = await Promise.all([
        supabase.from("profiles").select("id, created_at, status"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("transactions").select("type, amount, status, created_at"),
      ]);
      const usersData = users.data ?? [];
      const rolesData = roles.data ?? [];
      const txData = tx.data ?? [];
      const clientIds = new Set(rolesData.filter((r) => r.role === "client").map((r) => r.user_id));
      const deposits = txData.filter((t) => t.type === "deposit" && t.status === "completed");
      const withdraws = txData.filter((t) => t.type === "withdrawal" && t.status === "completed");
      return {
        totalUsers: usersData.length,
        totalClients: clientIds.size,
        activeUsers: usersData.filter((u) => u.status === "active").length,
        totalDeposits: deposits.reduce((s, t) => s + Number(t.amount), 0),
        totalWithdraws: withdraws.reduce((s, t) => s + Number(t.amount), 0),
        newSignups7d: last7DaysBuckets(usersData.map((u) => u.created_at)),
      };
    },
  });

  const fetchPrices = useServerFn(getMarketPrices);
  const { data: prices } = useQuery({
    queryKey: ["market-prices"],
    queryFn: () => fetchPrices({ data: { ids: ["bitcoin", "ethereum", "solana", "binancecoin", "ripple", "cardano"] } }),
    refetchInterval: 60_000,
    staleTime: 55_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Métricas em tempo real da plataforma.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/admin/clients" className="block">
          <Kpi icon={UserCircle2} label="Clientes" value={kpis?.totalClients ?? "—"} sub="Clique para gerenciar →" clickable />
        </Link>
        <Kpi icon={Users} label="Usuários totais" value={kpis?.totalUsers ?? "—"} sub={`${kpis?.activeUsers ?? 0} ativos`} />
        <Kpi icon={ArrowDownToLine} label="Depósitos" value={fmt(kpis?.totalDeposits)} accent="up" />
        <Kpi icon={ArrowUpToLine} label="Saques" value={fmt(kpis?.totalWithdraws)} accent="down" />
      </div>


      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-6">
          <h3 className="text-sm font-semibold text-muted-foreground">Novos cadastros (7 dias)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kpis?.newSignups7d ?? []}>
                <CartesianGrid stroke="oklch(0.28 0.006 260)" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="oklch(0.65 0.01 260)" fontSize={12} />
                <YAxis stroke="oklch(0.65 0.01 260)" fontSize={12} />
                <Tooltip contentStyle={{ background: "oklch(0.19 0.006 260)", border: "1px solid oklch(0.28 0.006 260)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="count" stroke="oklch(0.82 0.16 90)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center gap-2">
            <CoinsIcon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Mercado ao vivo</h3>
          </div>
          <div className="mt-4 space-y-2">
            {prices?.data ? (
              Object.entries(prices.data).map(([id, p]: [string, any]) => (
                <div key={id} className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-surface-elevated">
                  <span className="font-medium capitalize">{id}</span>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">${p.usd?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    <div className={`text-xs tabular-nums ${p.usd_24h_change >= 0 ? "text-up" : "text-down"}`}>
                      {p.usd_24h_change >= 0 ? "+" : ""}{p.usd_24h_change?.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, accent, clickable }: { icon: any; label: string; value: any; sub?: string; accent?: "up" | "down"; clickable?: boolean }) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-5 transition ${clickable ? "cursor-pointer hover:border-primary hover:bg-surface-elevated" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent === "up" ? "text-up" : accent === "down" ? "text-down" : "text-primary"}`} />
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function fmt(n?: number) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
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
