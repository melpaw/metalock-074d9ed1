import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function BuyCryptoDialog({ target, onClose }: { target: any; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [fromCurrencyId, setFromCurrencyId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  const { data: wallets } = useQuery({
    queryKey: ["me-wallets-buy"],
    queryFn: async () => (await supabase.from("wallets").select("*, currencies(*)")).data ?? [],
  });

  const eligible = (wallets ?? []).filter((w: any) => w.currency_id !== target.id && Number(w.available) > 0);
  const selected = eligible.find((w: any) => w.currency_id === fromCurrencyId);

  const fromPrice = Number(selected?.currencies?.usd_price ?? 0);
  const toPrice = Number(target.priceUsd ?? target.usd_price ?? 0);
  const est = useMemo(() => {
    const a = Number(amount);
    if (!a || !fromPrice || !toPrice) return 0;
    return (a * fromPrice) / toPrice;
  }, [amount, fromPrice, toPrice]);

  const cashback = useMemo(() => {
    const a = Number(amount);
    if (!a || !fromPrice) return 0;
    return a * fromPrice * 0.005;
  }, [amount, fromPrice]);

  const buy = useMutation({
    mutationFn: async () => {
      if (!fromCurrencyId) throw new Error(t("buy.errors.wallet"));
      const a = Number(amount);
      if (!a || a <= 0) throw new Error(t("buy.errors.amount"));
      if (selected && a > Number(selected.available)) throw new Error(t("buy.errors.balance"));
      const { error } = await supabase.rpc("client_request_buy", {
        _from_currency: fromCurrencyId,
        _to_currency: target.id,
        _from_amount: a,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("buy.sent"));
      qc.invalidateQueries({ queryKey: ["my-wallets"] });
      qc.invalidateQueries({ queryKey: ["my-transactions"] });
      qc.invalidateQueries({ queryKey: ["me-wallets-buy"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("buy.title", { asset: `${target.name} (${target.symbol})` })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-sm border border-border bg-surface-elevated p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("buy.price")}</span>
              <span className="font-bold tabular-nums">${toPrice.toFixed(4)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t("buy.payWith")}</label>
            <Select value={fromCurrencyId} onValueChange={setFromCurrencyId}>
              <SelectTrigger><SelectValue placeholder={t("buy.selectWallet")} /></SelectTrigger>
              <SelectContent>
                {eligible.length === 0 && <SelectItem value="_none" disabled>{t("buy.noWallets")}</SelectItem>}
                {eligible.map((w: any) => (
                  <SelectItem key={w.currency_id} value={w.currency_id}>
                    {w.currencies?.symbol} — {Number(w.available).toFixed(6)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {t("buy.amountIn", { symbol: selected?.currencies?.symbol ?? "..." })}
            </label>
            <Input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            {selected && (
              <div className="text-[10px] text-muted-foreground">
                {t("buy.available")}: {Number(selected.available).toFixed(8)} {selected.currencies?.symbol}
              </div>
            )}
          </div>

          {est > 0 && (
            <div className="rounded-sm border border-primary/30 bg-primary/5 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("buy.estimate")}</span>
                <span className="font-bold tabular-nums">{est.toFixed(8)} {target.symbol}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("buy.cashback")}</span>
                <span className="font-bold tabular-nums text-up">+${cashback.toFixed(2)}</span></div>
            </div>
          )}

          <Button className="w-full" disabled={buy.isPending || !fromCurrencyId || !amount} onClick={() => buy.mutate()}>
            {buy.isPending ? t("common.sending") : t("buy.confirm")}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground">
            {t("buy.pendingHint")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
