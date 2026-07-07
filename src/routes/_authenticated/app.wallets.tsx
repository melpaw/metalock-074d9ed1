import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getMarketPrices } from "@/lib/prices.functions";
import { CryptoIcon } from "@/components/CryptoIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Wallet, Send, ArrowDownToLine, QrCode, ChevronRight, TrendingUp, TrendingDown, ExternalLink, Clock } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";



export const Route = createFileRoute("/_authenticated/app/wallets")({
  component: WalletsPage,
});

function WalletsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const pricesFn = useServerFn(getMarketPrices);
  const [selected, setSelected] = useState<any | null>(null);

  const { data: wallets } = useQuery({
    queryKey: ["all-my-wallets"],
    queryFn: async () => (await supabase.from("wallets").select("*, currencies(*)")).data ?? [],
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const { data: currencies } = useQuery({
    queryKey: ["currencies-active"],
    queryFn: async () => (await supabase.from("currencies").select("*").eq("active", true).order("symbol")).data ?? [],
    placeholderData: keepPreviousData,
  });
  const { data: addresses } = useQuery({
    queryKey: ["my-deposit-addresses-all"],
    queryFn: async () => (await supabase.from("deposit_addresses" as any).select("*")).data as any[] ?? [],
    placeholderData: keepPreviousData,
  });

  const ids = useMemo(() => (wallets ?? []).map((w: any) => w.currencies?.coingecko_id).filter(Boolean) as string[], [wallets]);
  const { data: pRes } = useQuery({
    queryKey: ["wallets-prices", ids.join(",")],
    queryFn: () => pricesFn({ data: { ids: ids.length ? ids : ["bitcoin"] } }),
    enabled: ids.length > 0,
    refetchInterval: 60000,
    placeholderData: keepPreviousData,
  });
  const prices = (pRes as any)?.data ?? {};

  // realtime
  useEffect(() => {
    let cancelled = false; let ch: any = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;
      ch = supabase.channel(`wl-${data.user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${data.user.id}` },
          () => qc.invalidateQueries({ queryKey: ["all-my-wallets"] }))
        .subscribe();
    })();
    return () => { cancelled = true; if (ch) supabase.removeChannel(ch); };
  }, [qc]);

  const rows = (wallets ?? []).map((w: any) => {
    const cg = w.currencies?.coingecko_id;
    const sym = (w.currencies?.symbol ?? "").toUpperCase();
    const stables = ["USDT","USDC","DAI","BUSD","TUSD","USD"];
    const live = cg ? prices[cg]?.usd : undefined;
    const fallback = Number(w.currencies?.usd_price ?? 0) || (stables.includes(sym) ? 1 : 0);
    const price = live ?? fallback;
    const change24 = cg ? prices[cg]?.usd_24h_change ?? 0 : 0;
    const total = Number(w.available) + Number(w.locked);
    const usd = total * price;
    const addr = (addresses ?? []).find((a: any) => a.currency_id === w.currency_id);
    return { ...w, price, change24, total, usd, addr };
  }).sort((a: any, b: any) => b.usd - a.usd);

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success(t("wallet.copied")); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.wallets")}</h1>
        <p className="text-sm text-muted-foreground">{t("wallets.subtitle")}</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-sm border border-border bg-surface p-12 text-center text-sm text-muted-foreground">
          <Wallet className="mx-auto mb-2 h-10 w-10 opacity-40" />
          {t("overview.empty")}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r: any) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="group rounded-sm border border-border bg-surface p-4 text-left transition hover:border-primary hover:bg-surface-elevated"
            >
              <div className="flex items-center gap-3">
                <CryptoIcon id={r.currencies?.coingecko_id} symbol={r.currencies?.symbol} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate font-semibold">{r.currencies?.name}</div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{r.currencies?.symbol}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="font-mono text-lg font-bold tabular-nums">{Number(r.total).toFixed(6)}</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="tabular-nums text-muted-foreground">${r.usd.toLocaleString(i18n.language, { maximumFractionDigits: 2 })}</span>
                  <span className={`flex items-center gap-1 tabular-nums ${r.change24 >= 0 ? "text-up" : "text-down"}`}>
                    {r.change24 >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {r.change24 >= 0 ? "+" : ""}{r.change24.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px]">
                {r.addr?.status === "ready" ? (
                  <Badge variant="outline" className="border-up/40 text-up">{t("wallet.ready")}</Badge>
                ) : r.addr ? (
                  <Badge variant="outline" className="border-warning/40 text-warning">{t("wallet.waitingAdmin")}</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">{t("wallet.noAddress", { defaultValue: "Sem endereço" })}</Badge>
                )}
                <span className="text-primary opacity-0 transition group-hover:opacity-100">{t("common.details", { defaultValue: "Detalhes" })} →</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <WalletDetailDialog
          row={selected}
          onClose={() => setSelected(null)}
          wallets={wallets ?? []}
          currencies={currencies ?? []}
          prices={prices}
          copy={copy}
          language={i18n.language}
        />
      )}
    </div>
  );
}

function WalletDetailDialog({ row, onClose, wallets, currencies, prices, copy, language }: any) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: history } = useQuery({
    queryKey: ["wallet-history", row.currency_id],
    queryFn: async () => (await supabase.from("transactions")
      .select("*, currencies(symbol)")
      .eq("currency_id", row.currency_id)
      .order("created_at", { ascending: false })
      .limit(50)).data ?? [],
    placeholderData: keepPreviousData,
  });

  const [qrOpen, setQrOpen] = useState(false);
  const [qrSigned, setQrSigned] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      if (!row.addr?.qr_image_path) return;
      const { data } = await supabase.storage.from("deposit-qr").createSignedUrl(row.addr.qr_image_path, 300);
      setQrSigned(data?.signedUrl ?? null);
    })();
  }, [row.addr?.qr_image_path]);

  async function requestAddress() {
    const { error } = await supabase.rpc("client_request_deposit_address" as any, { _currency_id: row.currency_id });
    if (error) return toast.error(error.message);
    toast.success(t("wallet.requestHint"));
    qc.invalidateQueries({ queryKey: ["my-deposit-addresses-all"] });
  }

  const address = row.addr?.address as string | undefined;
  const qrFallback = address ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(address)}` : null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <CryptoIcon id={row.currencies?.coingecko_id} symbol={row.currencies?.symbol} />
            <span>{row.currencies?.name} <span className="text-muted-foreground text-sm ml-1">{row.currencies?.symbol}</span></span>
          </DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="rounded-sm border border-border bg-surface-elevated p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("wallets.balance")}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-3xl font-black tabular-nums">{Number(row.total).toFixed(8)}</div>
            <div className="text-sm text-muted-foreground">{row.currencies?.symbol}</div>
          </div>
          <div className="text-sm text-muted-foreground">≈ ${row.usd.toLocaleString(language, { maximumFractionDigits: 2 })}</div>
          <div className={`mt-1 text-xs tabular-nums ${row.change24 >= 0 ? "text-up" : "text-down"}`}>
            {row.change24 >= 0 ? "+" : ""}{row.change24.toFixed(2)}% (24h) · ${row.price.toLocaleString(language, { maximumFractionDigits: 4 })}
          </div>
        </div>

        <Tabs defaultValue="receive" className="mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-surface-elevated">
            <TabsTrigger value="receive"><ArrowDownToLine className="h-4 w-4 mr-1" /> {t("wallet.receive", { defaultValue: "Receber" })}</TabsTrigger>
            <TabsTrigger value="send"><Send className="h-4 w-4 mr-1" /> {t("wallet.send")}</TabsTrigger>
            <TabsTrigger value="history">{t("wallet.history", { defaultValue: "Histórico" })}</TabsTrigger>
          </TabsList>

          <TabsContent value="receive" className="mt-3 space-y-3">
            {!row.addr && (
              <div className="rounded-sm border border-dashed border-border p-4 text-center space-y-3">
                <p className="text-sm text-muted-foreground">{t("wallet.noAddressHint", { defaultValue: "Você ainda não possui um endereço para esta moeda." })}</p>
                <Button onClick={requestAddress}>{t("wallet.requestAddress")}</Button>
              </div>
            )}
            {row.addr && row.addr.status !== "ready" && (
              <div className="rounded-sm border border-warning/40 bg-warning/10 p-4 text-sm">
                {t("wallet.waitingAdmin")} — {t("wallet.willNotify")}
              </div>
            )}
            {address && row.addr?.status === "ready" && (
              <div className="grid gap-4 sm:grid-cols-[240px_minmax(0,1fr)]">
                <div className="rounded-sm border border-border bg-background p-3 flex items-center justify-center">
                  {qrSigned ? (
                    <img src={qrSigned} alt="QR" className="max-h-56 w-full object-contain" />
                  ) : (
                    <img src={qrFallback ?? ""} alt="QR" className="max-h-56 w-full object-contain" />
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">{t("wallets.address")}</div>
                    <code className="mt-1 block break-all rounded-sm bg-surface-elevated p-2 text-xs font-mono">{address}</code>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => copy(address)}>
                      <Copy className="mr-1 h-3.5 w-3.5" /> {t("common.copy", { defaultValue: "Copiar" })}
                    </Button>
                  </div>
                  {row.addr.network && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">{t("wallet.network", { defaultValue: "Rede" })}: </span>
                      <span className="font-medium">{row.addr.network}</span>
                    </div>
                  )}
                  {row.addr.memo_tag && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">{t("wallet.memoTag")}: </span>
                      <code className="rounded-sm bg-surface-elevated px-1.5 py-0.5">{row.addr.memo_tag}</code>
                      <Button size="icon" variant="ghost" className="h-6 w-6 ml-1" onClick={() => copy(row.addr.memo_tag)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {row.addr.qr_image_path && (
                    <Button size="sm" variant="outline" onClick={() => setQrOpen(true)}>
                      <QrCode className="mr-1 h-3.5 w-3.5" /> {t("wallet.seeQr")}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="send" className="mt-3">
            <SendRequestPanel
              row={row}
              onDone={() => {
                qc.invalidateQueries({ queryKey: ["all-my-wallets"] });
                qc.invalidateQueries({ queryKey: ["wallet-history", row.currency_id] });
              }}
            />
          </TabsContent>


          <TabsContent value="history" className="mt-3">
            {!history || history.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">{t("overview.noTx")}</div>
            ) : (
              <div className="divide-y divide-border rounded-sm border border-border">
                {history.map((tx: any) => (
                  <div key={tx.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-sm">
                    <span className={`h-2 w-2 rounded-sm ${
                      tx.status === "completed" ? "bg-up" :
                      tx.status === "pending" ? "bg-warning" : "bg-down"
                    }`} />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{t(`tx.${tx.type}`, { defaultValue: tx.type })}</div>
                      <div className="text-[11px] text-muted-foreground">{new Date(tx.created_at).toLocaleString(language)}</div>
                    </div>
                    <div className={`text-right font-mono tabular-nums ${Number(tx.amount) >= 0 ? "text-up" : "text-down"}`}>
                      {Number(tx.amount) >= 0 ? "+" : ""}{Number(tx.amount).toFixed(6)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {qrOpen && qrSigned && (
          <Dialog open onOpenChange={(o) => !o && setQrOpen(false)}>
            <DialogContent>
              <DialogHeader><DialogTitle>QR · {row.currencies?.symbol}</DialogTitle></DialogHeader>
              <img src={qrSigned} alt="QR" className="mx-auto max-h-96 rounded-sm bg-background p-2" />
              <div className="text-xs font-mono break-all text-center">{address}</div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SendRequestPanel({ row, onDone }: { row: any; onDone: () => void }) {
  const { t } = useTranslation();
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const available = Number(row.available ?? 0);

  async function submit() {
    if (!toAddress.trim() || !amount) return toast.error(t("wallet.fillAll"));
    const amt = Number(amount);
    if (!(amt > 0)) return toast.error(t("wallet.invalidAmount", { defaultValue: "Valor inválido" }));
    if (amt > available) return toast.error(t("wallet.insufficient", { defaultValue: "Saldo insuficiente" }));
    setLoading(true);
    try {
      const { error } = await supabase.rpc("client_request_external_send" as any, {
        _currency_id: row.currency_id,
        _amount: amt,
        _to_address: toAddress.trim(),
        _notes: notes.trim() || null,
      });
      if (error) throw error;
      toast.success(t("wallet.sendRequested", { defaultValue: "Solicitação enviada para aprovação" }));
      setToAddress(""); setAmount(""); setNotes(""); onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-sm border border-warning/40 bg-warning/10 p-3 text-xs flex items-start gap-2">
        <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>{t("wallet.sendPendingHint")}</span>
      </div>
      <div>
        <Label>{t("wallet.destinationAddress", { defaultValue: "Endereço de destino" })}</Label>
        <Input value={toAddress} onChange={(e) => setToAddress(e.target.value)} placeholder={row.currencies?.symbol + " address"} />
      </div>
      <div>
        <div className="flex items-end justify-between">
          <Label>{t("common.amount")}</Label>
          <button type="button" className="text-xs text-primary hover:underline" onClick={() => setAmount(String(available))}>
            {t("wallet.max")} · {available.toFixed(6)} {row.currencies?.symbol}
          </button>
        </div>
        <Input type="number" step="0.00000001" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
      </div>
      <div>
        <Label>{t("wallet.notesOptional", { defaultValue: "Observações (opcional)" })}</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="—" />
      </div>
      <Button onClick={submit} disabled={loading} className="w-full">
        <Send className="mr-1 h-4 w-4" />
        {loading ? t("common.sending") : t("wallet.requestSend", { defaultValue: "Solicitar envio" })}
      </Button>
    </div>
  );
}

