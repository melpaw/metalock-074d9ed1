import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getMarketPrices } from "@/lib/prices.functions";
import { CryptoIcon } from "@/components/CryptoIcon";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, ShoppingCart } from "lucide-react";
import { BuyCryptoDialog } from "@/components/BuyCryptoDialog";

export function MarketPanel() {
  const { t } = useTranslation();
  const pricesFn = useServerFn(getMarketPrices);
  const [buyCurrency, setBuyCurrency] = useState<any | null>(null);

  const { data: currencies } = useQuery({
    queryKey: ["market-currencies"],
    queryFn: async () =>
      (await supabase.from("currencies").select("*").eq("active", true).order("symbol")).data ?? [],
  });

  const ids = (currencies ?? []).map((c: any) => c.coingecko_id).filter(Boolean) as string[];
  const { data: pRes } = useQuery({
    queryKey: ["market-prices-panel", ids.join(",")],
    queryFn: () => pricesFn({ data: { ids: ids.length ? ids : ["bitcoin"] } }),
    enabled: ids.length > 0,
    refetchInterval: 60000,
  });
  const prices = (pRes as any)?.data ?? {};

  return (
    <section className="rounded-sm border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="font-semibold">{t("nav.market")}</h2>
          <p className="text-xs text-muted-foreground">{t("market.buyOneClick")}</p>
        </div>
        <ShoppingCart className="h-4 w-4 text-primary" />
      </div>
      <div className="max-h-[520px] divide-y divide-border overflow-y-auto">
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

      {buyCurrency && (
        <BuyCryptoDialog
          target={buyCurrency}
          onClose={() => setBuyCurrency(null)}
        />
      )}
    </section>
  );
}
