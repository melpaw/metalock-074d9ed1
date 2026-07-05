import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMarketPrices } from "@/lib/prices.functions";
import { useServerFn } from "@tanstack/react-start";
import { TrendingUp, Wallet, Layers } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: OverviewPage,
});

function OverviewPage() {
  const pricesFn = useServerFn(getMarketPrices);

  const { data: wallets } = useQuery({
    queryKey: ["my-wallets"],
    queryFn: async () => (await supabase.from("wallets").select("*, currencies(*)")).data ?? [],
  });
  const { data: investments } = useQuery({
    queryKey: ["my-investments"],
    queryFn: async () => (await supabase.from("investments").select("*, plans(name), currencies(symbol)").eq("status", "active")).data ?? [],
  });
  const { data: pricesRes } = useQuery({
    queryKey: ["prices-overview"],
    queryFn: () => pricesFn({ data: { ids: ["bitcoin","ethereum","tether","binancecoin","solana"] } }),
    refetchInterval: 60000,
  });
  const prices = pricesRes?.data;

  const totalUsd = wallets?.reduce((sum, w: any) => {
    const cg = w.currencies?.coingecko_id;
    const price = cg ? (prices as any)?.[cg]?.usd ?? 0 : (w.currencies?.symbol === "USDT" ? 1 : 0);
    return sum + Number(w.available) * price;
  }, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bem-vindo</h1>
        <p className="text-sm text-muted-foreground">Visão geral da sua conta</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi icon={<Wallet className="h-5 w-5" />} label="Patrimônio total" value={`$${totalUsd.toLocaleString("en-US",{maximumFractionDigits:2})}`} />
        <Kpi icon={<Layers className="h-5 w-5" />} label="Moedas em carteira" value={String(wallets?.length ?? 0)} />
        <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Investimentos ativos" value={String(investments?.length ?? 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Minhas carteiras</h2>
            <Link to="/app/wallet" className="text-xs text-primary hover:underline">Ver todas →</Link>
          </div>
          <div className="space-y-2">
            {wallets?.slice(0,5).map((w: any) => (
              <div key={w.id} className="flex items-center justify-between rounded-md border border-border/50 p-3">
                <div>
                  <div className="font-medium">{w.currencies?.symbol}</div>
                  <div className="text-xs text-muted-foreground">{w.currencies?.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono">{Number(w.available).toFixed(6)}</div>
                  {Number(w.locked) > 0 && <div className="text-xs text-warning">bloq: {Number(w.locked).toFixed(6)}</div>}
                </div>
              </div>
            ))}
            {wallets?.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Faça um depósito para começar.</div>}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Investimentos ativos</h2>
            <Link to="/app/invest" className="text-xs text-primary hover:underline">Novo →</Link>
          </div>
          <div className="space-y-2">
            {investments?.slice(0,5).map((i: any) => (
              <div key={i.id} className="rounded-md border border-border/50 p-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{i.plans?.name}</span>
                  <span className="font-mono text-sm">{Number(i.amount).toFixed(4)} {i.currencies?.symbol}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {i.daily_rate}% ao dia · até {new Date(i.end_date).toLocaleDateString("pt-BR")}
                </div>
              </div>
            ))}
            {investments?.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Nenhum investimento ativo.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
