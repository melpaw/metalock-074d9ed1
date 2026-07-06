import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getMarketPrices } from "@/lib/prices.functions";
import { CryptoIcon } from "@/components/CryptoIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ShoppingCart, Gift } from "lucide-react";
import { BuyCryptoDialog } from "@/components/BuyCryptoDialog";

export const Route = createFileRoute("/_authenticated/app/market")({
  component: MarketPage,
});

function MarketPage() {
  const { t, i18n } = useTranslation();
  const pricesFn = useServerFn(getMarketPrices);
  const [buyCurrency, setBuyCurrency] = useState<any | null>(null);

  const { data: currencies } = useQuery({
    queryKey: ["market-currencies"],
    queryFn: async () => (await supabase.from("currencies").select("*").eq("active", true).order("symbol")).data ?? [],
  });

  const { data: cashbackTxs } = useQuery({
    queryKey: ["my-cashback"],
    queryFn: async () => {
      const { data } = await supabase.from("transactions")
        .select("*, currencies(symbol)")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []).filter((tx: any) => tx.metadata?.kind === "cashback");
    },
  });

  const ids = (currencies ?? []).map((c: any) => c.coingecko_id).filter(Boolean) as string[];
  const { data: pRes } = useQuery({
    queryKey: ["market-page-prices", ids.join(",")],
    queryFn: () => pricesFn({ data: { ids: ids.length ? ids : ["bitcoin"] } }),
    enabled: ids.length > 0,
    refetchInterval: 60000,
  });
  const prices = (pRes as any)?.data ?? {};

  const totalCashback = (cashbackTxs ?? []).reduce((s, tx: any) => s + Number(tx.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.market")}</h1>
        <p className="text-sm text-muted-foreground">{t("market.subtitle")}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-sm border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground"><Gift className="h-3.5 w-3.5" /> {t("market.cashbackAvailable")}</div>
          <div className="mt-1 text-2xl font-black tabular-nums">{totalCashback.toFixed(4)} USDT</div>
          <div className="mt-1 text-xs text-muted-foreground">{t("market.cashbackHint")}</div>
        </div>
        <div className="rounded-sm border border-border bg-surface p-4">
          <div className="text-xs uppercase text-muted-foreground">{t("market.cashbackRate")}</div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">≤ $10,000</span><span className="font-bold text-primary tabular-nums">1%</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">$10,001 – $50,000</span><span className="font-bold text-primary tabular-nums">3%</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">&gt; $50,000</span><span className="font-bold text-primary tabular-nums">5%</span></div>
          </div>
        </div>
        <div className="rounded-sm border border-border bg-surface p-4">
          <div className="text-xs uppercase text-muted-foreground">{t("market.cashbackHistory")}</div>
          <div className="mt-1 text-2xl font-black tabular-nums">{cashbackTxs?.length ?? 0}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t("market.cashbackCount")}</div>
        </div>
      </section>

      <section className="rounded-sm border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold">{t("market.livePrices")}</h2>
            <p className="text-xs text-muted-foreground">{t("market.buyOneClick")}</p>
          </div>
          <ShoppingCart className="h-4 w-4 text-primary" />
        </div>
        <div className="divide-y divide-border">
          {(currencies ?? []).map((c: any) => {
            const p = c.coingecko_id ? prices[c.coingecko_id] : undefined;
            const price = p?.usd ?? Number(c.usd_price ?? 0);
            const change = p?.usd_24h_change ?? 0;
            return (
              <div key={c.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-5 py-3">
                <CryptoIcon id={c.coingecko_id} symbol={c.symbol} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{c.name}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.symbol}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold tabular-nums">${price.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                  <div className={`flex items-center justify-end gap-1 text-[10px] tabular-nums ${change >= 0 ? "text-up" : "text-down"}`}>
                    {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                  </div>
                </div>
                <Button size="sm" onClick={() => setBuyCurrency({ ...c, priceUsd: price })}>{t("market.buy")}</Button>
              </div>
            );
          })}
        </div>
      </section>

      {(cashbackTxs?.length ?? 0) > 0 && (
        <section className="rounded-sm border border-border bg-surface overflow-hidden">
          <div className="border-b border-border px-5 py-3 text-sm font-semibold">{t("market.cashbackHistory")}</div>
          <div className="divide-y divide-border">
            {cashbackTxs!.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <div className="font-medium">+{Number(tx.amount).toFixed(4)} {tx.currencies?.symbol ?? "USDT"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString(i18n.language)}</div>
                </div>
                <Badge variant="outline" className="border-up/40 text-up">Cashback</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {buyCurrency && (
        <BuyCryptoDialog target={buyCurrency} onClose={() => setBuyCurrency(null)} />
      )}
    </div>
  );
}
