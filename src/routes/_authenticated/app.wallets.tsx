import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getMarketPrices } from "@/lib/prices.functions";
import { CryptoIcon } from "@/components/CryptoIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/app/wallets")({
  component: WalletsPage,
});

function WalletsPage() {
  const { t, i18n } = useTranslation();
  const pricesFn = useServerFn(getMarketPrices);

  const { data: wallets } = useQuery({
    queryKey: ["all-my-wallets"],
    queryFn: async () => (await supabase.from("wallets").select("*, currencies(*)")).data ?? [],
  });
  const { data: addresses } = useQuery({
    queryKey: ["my-deposit-addresses-all"],
    queryFn: async () => (await supabase.from("deposit_addresses" as any).select("*")).data as any[] ?? [],
  });

  const ids = useMemo(() => (wallets ?? []).map((w: any) => w.currencies?.coingecko_id).filter(Boolean) as string[], [wallets]);
  const { data: pRes } = useQuery({
    queryKey: ["wallets-prices", ids.join(",")],
    queryFn: () => pricesFn({ data: { ids: ids.length ? ids : ["bitcoin"] } }),
    enabled: ids.length > 0,
    refetchInterval: 60000,
  });
  const prices = (pRes as any)?.data ?? {};

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success(t("wallet.copied")); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.wallets")}</h1>
        <p className="text-sm text-muted-foreground">{t("wallets.subtitle")}</p>
      </div>

      <div className="rounded-sm border border-border bg-surface overflow-hidden">
        {!wallets?.length ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Wallet className="mx-auto mb-2 h-10 w-10 opacity-40" />
            {t("overview.empty")}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">{t("wallets.name")}</th>
                <th className="px-4 py-3 text-right">{t("wallets.balance")}</th>
                <th className="px-4 py-3 text-right">{t("wallets.value")}</th>
                <th className="px-4 py-3 text-left">{t("wallets.address")}</th>
                <th className="px-4 py-3 text-center">{t("common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map((w: any) => {
                const cg = w.currencies?.coingecko_id;
                const price = cg ? prices[cg]?.usd ?? Number(w.currencies?.usd_price ?? 0) : Number(w.currencies?.usd_price ?? 0);
                const total = Number(w.available) + Number(w.locked);
                const usd = total * price;
                const addr = (addresses ?? []).find((a: any) => a.currency_id === w.currency_id);
                return (
                  <tr key={w.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CryptoIcon id={w.currencies?.coingecko_id} symbol={w.currencies?.symbol} />
                        <div>
                          <div className="font-semibold">{w.currencies?.name}</div>
                          <div className="text-[10px] uppercase text-muted-foreground">{w.currencies?.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{total.toFixed(8)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">${usd.toLocaleString(i18n.language, { maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3">
                      {addr?.address ? (
                        <div className="flex items-center gap-1">
                          <code className="max-w-[220px] truncate text-xs">{addr.address}</code>
                          <Button size="icon" variant="ghost" onClick={() => copy(addr.address)}><Copy className="h-3 w-3" /></Button>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {addr?.status === "ready" ? (
                        <Badge variant="outline" className="border-up/40 text-up">{t("wallet.ready")}</Badge>
                      ) : addr ? (
                        <Badge variant="outline" className="border-warning/40 text-warning">{t("wallet.waitingAdmin")}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">—</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
