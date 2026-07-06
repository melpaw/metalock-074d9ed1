import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getMarketPrices } from "@/lib/prices.functions";
import { useServerFn } from "@tanstack/react-start";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Wallet, ChevronRight, Info, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { WalletActions } from "@/components/wallet/WalletActions";
import { CryptoIcon } from "@/components/CryptoIcon";
import { MarketPanel } from "@/components/MarketPanel";
import { CashbackCard } from "@/components/CashbackCard";

export const Route = createFileRoute("/_authenticated/app/")({
  component: OverviewPage,
});

const PALETTE = ["#f7931a", "#627eea", "#26a17b", "#f0b90b", "#14f195", "#8247e5", "#e84142", "#0033ad", "#ff0080", "#00d4ff"];

function OverviewPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const pricesFn = useServerFn(getMarketPrices);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<any | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("display_currency,full_name").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const { data: wallets } = useQuery({
    queryKey: ["my-wallets"],
    queryFn: async () => (await supabase.from("wallets").select("*, currencies(*)")).data ?? [],
  });

  const { data: currencies } = useQuery({
    queryKey: ["currencies-active"],
    queryFn: async () => (await supabase.from("currencies").select("*").eq("active", true).order("symbol")).data ?? [],
  });

  const { data: txs } = useQuery({
    queryKey: ["my-transactions"],
    queryFn: async () => (await supabase.from("transactions").select("*, currencies(symbol)").order("created_at", { ascending: false }).limit(20)).data ?? [],
  });

  const cgIds = useMemo(
    () => Array.from(new Set([...(wallets ?? []), ...(currencies ?? [])].map((w: any) => w.currencies?.coingecko_id ?? w.coingecko_id).filter(Boolean))) as string[],
    [wallets, currencies],
  );
  const { data: pricesRes } = useQuery({
    queryKey: ["prices-overview", cgIds.join(",")],
    queryFn: () => pricesFn({ data: { ids: cgIds.length ? cgIds : ["bitcoin"] } }),
    enabled: cgIds.length > 0,
    refetchInterval: 60000,
  });
  const prices = (pricesRes as any)?.data ?? {};

  const displayCurrency = (profile as any)?.display_currency ?? "USD";
  const fxUsdToEur = prices["tether"]?.eur ?? 0.92;
  const toDisplay = (usd: number) => displayCurrency === "EUR" ? usd * fxUsdToEur : usd;
  const fmt = (v: number) => new Intl.NumberFormat(i18n.language, { style: "currency", currency: displayCurrency, maximumFractionDigits: 2 }).format(v);

  const rows = (wallets ?? []).map((w: any) => {
    const cg = w.currencies?.coingecko_id;
    const livePrice = cg ? prices[cg]?.usd : undefined;
    const sym = (w.currencies?.symbol ?? "").toUpperCase();
    const fallback = Number(w.currencies?.usd_price ?? 0) || (sym === "USDT" || sym === "USD" ? 1 : sym === "EUR" ? 1 / fxUsdToEur : 0);
    const priceUsd = livePrice ?? fallback;
    const change24 = cg ? prices[cg]?.usd_24h_change ?? 0 : 0;
    const total = Number(w.available) + Number(w.locked);
    const valueUsd = total * priceUsd;
    return { ...w, priceUsd, change24, valueUsd, total };
  }).sort((a: any, b: any) => b.valueUsd - a.valueUsd);

  const totalUsd = rows.reduce((s: number, r: any) => s + r.valueUsd, 0);
  const chartData = rows.map((r: any, i: number) => ({
    name: r.currencies?.symbol ?? "?",
    value: r.valueUsd,
    percent: totalUsd ? (r.valueUsd / totalUsd) * 100 : 0,
    color: PALETTE[i % PALETTE.length],
  }));

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["my-wallets"] });
    qc.invalidateQueries({ queryKey: ["my-transactions"] });
    qc.invalidateQueries({ queryKey: ["my-deposit-addresses"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("overview.title")}{(profile as any)?.full_name ? `, ${(profile as any).full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">{t("overview.subtitle")}</p>
      </div>

      {/* Hero: donut + balance */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface via-surface to-surface-elevated p-6 shadow-lg">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="relative grid gap-6 items-center md:grid-cols-[260px_1fr]">
          {/* Donut */}
          <div className="mx-auto md:mx-0">
            <div className="relative h-[240px] w-[240px]">
              {chartData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="value" innerRadius={78} outerRadius={112} paddingAngle={3} stroke="none" cornerRadius={6}>
                        {chartData.map((c) => <Cell key={c.name} fill={c.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--surface-elevated))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: any, _n: any, p: any) => [fmt(toDisplay(Number(v))), p.payload.name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("overview.totalBalance")}</div>
                    <div className="mt-1 text-xl font-black tabular-nums leading-tight">{fmt(toDisplay(totalUsd))}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{t("overview.coinsInWallet", { count: rows.length })}</div>
                  </div>
                </>
              ) : (
                <div className="grid h-full w-full place-items-center rounded-full border-[10px] border-dashed border-border text-center p-6">
                  <div><Wallet className="mx-auto mb-2 h-10 w-10 opacity-40" /><div className="text-xs text-muted-foreground">{t("overview.empty")}</div></div>
                </div>
              )}
            </div>
          </div>

          {/* Legend (no duplicated balance — it's inside the donut) */}
          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("overview.myWallets")}</div>
              <div className="text-sm text-muted-foreground">{t("overview.coinsInWallet", { count: rows.length })}</div>
            </div>
            {chartData.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                {chartData.slice(0, 8).map((c) => (
                  <div key={c.name} className="flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: c.color }} />
                    <span className="font-medium">{c.name}</span>
                    <span className="ml-auto tabular-nums text-muted-foreground">{c.percent.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("overview.empty")}</p>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="rounded-sm border border-border bg-surface p-4">
            <div className="mb-3">
              <h2 className="font-semibold">{t("overview.walletActions")}</h2>
              <p className="text-xs text-muted-foreground">{t("overview.walletActionsSubtitle")}</p>
            </div>
            <WalletActions wallets={wallets ?? []} currencies={currencies ?? []} prices={prices} onDone={refresh} />
          </section>

          <section className="rounded-sm border border-border bg-surface overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 border-b border-border">
              <div className="min-w-0">
                <h2 className="font-semibold truncate">{t("overview.myWallets")}</h2>
                <p className="text-xs text-muted-foreground">{t("overview.coinsInWallet", { count: rows.length })}</p>
              </div>
              <Wallet className="h-4 w-4 shrink-0 text-primary" />
            </div>
            {rows.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">{t("overview.empty")}</div>
            ) : (
              <div className="max-h-[520px] divide-y divide-border overflow-y-auto">
                {rows.map((r: any) => (
                  <button key={r.id} type="button" onClick={() => setSelectedWallet(r)} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 text-left transition hover:bg-surface-elevated/50">
                    <CryptoIcon id={r.currencies?.coingecko_id} symbol={r.currencies?.symbol} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{r.currencies?.name ?? r.currencies?.symbol}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{Number(r.total).toFixed(6)} {r.currencies?.symbol}</div>
                      <div className={`mt-0.5 flex items-center gap-1 text-xs tabular-nums ${r.change24 >= 0 ? "text-up" : "text-down"}`}>
                        {r.change24 >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {r.change24 >= 0 ? "+" : ""}{r.change24.toFixed(2)}%
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-bold tabular-nums">{fmt(toDisplay(r.valueUsd))}</div>
                        <div className="text-[10px] text-muted-foreground">{totalUsd ? ((r.valueUsd / totalUsd) * 100).toFixed(1) : 0}%</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <CashbackCard />
          <MarketPanel />
        </aside>
      </div>

      {/* Recent transactions */}
      <section className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">{t("overview.recentTx")}</h2>
          <span className="text-xs text-muted-foreground">{t("overview.lastNTx", { n: Math.min(txs?.length ?? 0, 20) })}</span>
        </div>
        {!txs || txs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">{t("overview.noTx")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-elevated/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">{t("tx.type")}</th>
                  <th className="px-4 py-3 text-left">{t("tx.status")}</th>
                  <th className="px-4 py-3 text-right">{t("tx.amount")}</th>
                  <th className="px-4 py-3 text-right">{t("tx.date")}</th>
                  <th className="px-4 py-3 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx: any) => (
                  <tr key={tx.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TxTypeIcon type={tx.type} />
                        <span>{t(`tx.${tx.type}`, { defaultValue: tx.type })}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={
                        tx.status === "completed" ? "border-up/30 text-up" :
                        tx.status === "pending" ? "border-warning/30 text-warning" :
                        "border-down/30 text-down"
                      }>{t(`tx.${tx.status}`, { defaultValue: tx.status })}</Badge>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${Number(tx.amount) >= 0 ? "text-up" : "text-down"}`}>
                      {Number(tx.amount) >= 0 ? "+" : ""}{Number(tx.amount).toFixed(8)} {tx.currencies?.symbol}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{new Date(tx.created_at).toLocaleString(i18n.language)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedTx(tx)}>
                        <Info className="mr-1 h-3.5 w-3.5" /> {t("tx.details")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TransactionDetailsDialog tx={selectedTx} onClose={() => setSelectedTx(null)} language={i18n.language} />
      <WalletDetailsDialog wallet={selectedWallet} onClose={() => setSelectedWallet(null)} fmt={(v) => fmt(toDisplay(v))} totalUsd={totalUsd} />
    </div>
  );
}

function TransactionDetailsDialog({ tx, onClose, language }: { tx: any | null; onClose: () => void; language: string }) {
  const { t } = useTranslation();
  if (!tx) return null;

  const metadata = tx.metadata ?? {};
  const rows = [
    [t("tx.type"), t(`tx.${tx.type}`, { defaultValue: tx.type })],
    [t("tx.status"), t(`tx.${tx.status}`, { defaultValue: tx.status })],
    [t("tx.amount"), `${Number(tx.amount).toFixed(8)} ${tx.currencies?.symbol ?? ""}`],
    [t("tx.fee"), `${Number(tx.fee ?? 0).toFixed(8)} ${tx.currencies?.symbol ?? ""}`],
    [t("tx.reference"), tx.reference],
    [t("tx.hash"), metadata.tx_hash],
    [t("tx.sender"), metadata.sender_address],
    [t("tx.note"), tx.note],
    [t("tx.date"), new Date(tx.created_at).toLocaleString(language)],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("tx.detailsTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{t(`tx.${tx.type}`, { defaultValue: tx.type })}</div>
            <div className={`mt-1 text-2xl font-black tabular-nums ${Number(tx.amount) >= 0 ? "text-up" : "text-down"}`}>
              {Number(tx.amount) >= 0 ? "+" : ""}{Number(tx.amount).toFixed(8)} {tx.currencies?.symbol}
            </div>
          </div>
          <div className="grid gap-2">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="min-w-0 break-words font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WalletDetailsDialog({ wallet, onClose, fmt, totalUsd }: { wallet: any | null; onClose: () => void; fmt: (valueUsd: number) => string; totalUsd: number }) {
  const { t } = useTranslation();
  if (!wallet) return null;
  const percent = totalUsd ? (wallet.valueUsd / totalUsd) * 100 : 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{wallet.currencies?.name ?? wallet.currencies?.symbol}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-elevated p-4">
            <CryptoIcon id={wallet.currencies?.coingecko_id} symbol={wallet.currencies?.symbol} className="h-12 w-12" />
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{wallet.currencies?.symbol}</div>
              <div className="text-2xl font-black tabular-nums">{fmt(wallet.valueUsd)}</div>
              <div className={`mt-1 flex items-center gap-1 text-xs tabular-nums ${wallet.change24 >= 0 ? "text-up" : "text-down"}`}>
                {wallet.change24 >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {wallet.change24 >= 0 ? "+" : ""}{wallet.change24.toFixed(2)}%
              </div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <DetailTile label={t("overview.amount")} value={`${Number(wallet.total).toFixed(8)} ${wallet.currencies?.symbol}`} />
            <DetailTile label={t("wallet.price")} value={fmt(wallet.priceUsd)} />
            <DetailTile label={t("overview.value")} value={fmt(wallet.valueUsd)} />
            <DetailTile label={t("overview.allocation")} value={`${percent.toFixed(2)}%`} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function TxTypeIcon({ type }: { type: string }) {
  const map: Record<string, { icon: any; color: string; bg: string }> = {
    deposit: { icon: ArrowDownLeft, color: "text-up", bg: "bg-up/15" },
    withdrawal: { icon: ArrowUpRight, color: "text-down", bg: "bg-down/15" },
    swap: { icon: ArrowLeftRight, color: "text-primary", bg: "bg-primary/15" },
    investment: { icon: Wallet, color: "text-primary", bg: "bg-primary/10" },
    adjustment: { icon: Info, color: "text-muted-foreground", bg: "bg-muted/40" },
  };
  const cfg = map[type] ?? map.adjustment;
  const Icon = cfg.icon;
  return (
    <span className={`grid h-6 w-6 place-items-center rounded-sm ${cfg.bg}`}>
      <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
    </span>
  );
}

