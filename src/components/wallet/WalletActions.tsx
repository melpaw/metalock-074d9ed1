import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownToLine, Send, ArrowLeftRight, Building2, Copy, QrCode, Clock } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function WalletActions({ wallets, currencies, prices, onDone }: { wallets: any[]; currencies: any[]; prices: any; onDone: () => void }) {
  const { t } = useTranslation();
  return (
    <Tabs defaultValue="deposit" className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-4 gap-1 bg-surface-elevated p-1">
        <TabsTrigger value="deposit" className="min-h-10 px-2 text-xs"><ArrowDownToLine className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">{t("wallet.deposit")}</span></TabsTrigger>
        <TabsTrigger value="send" className="min-h-10 px-2 text-xs"><Send className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">{t("wallet.send")}</span></TabsTrigger>
        <TabsTrigger value="swap" className="min-h-10 px-2 text-xs"><ArrowLeftRight className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">{t("wallet.swap")}</span></TabsTrigger>
        <TabsTrigger value="withdraw" className="min-h-10 px-2 text-xs"><Building2 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">{t("wallet.withdraw")}</span></TabsTrigger>
      </TabsList>
      <TabsContent value="deposit" className="mt-3"><DepositPanel currencies={currencies} onDone={onDone} /></TabsContent>
      <TabsContent value="send" className="mt-3"><SendPanel wallets={wallets} currencies={currencies} onDone={onDone} /></TabsContent>
      <TabsContent value="swap" className="mt-3"><SwapPanel wallets={wallets} currencies={currencies} prices={prices} onDone={onDone} /></TabsContent>
      <TabsContent value="withdraw" className="mt-3"><WithdrawPanel wallets={wallets} prices={prices} onDone={onDone} /></TabsContent>
    </Tabs>
  );
}

function DepositPanel({ currencies, onDone }: { currencies: any[]; onDone: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [currencyId, setCurrencyId] = useState("");
  const [viewer, setViewer] = useState<any | null>(null);
  const { data: my } = useQuery({
    queryKey: ["my-deposit-addresses"],
    queryFn: async () => (await supabase.from("deposit_addresses" as any).select("*, currencies(symbol,name,network)").order("created_at", { ascending: false })).data as any[] ?? [],
    refetchInterval: 15000,
  });
  const request = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("client_request_deposit_address" as any, { _currency_id: currencyId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t("wallet.requestHint")); setCurrencyId(""); qc.invalidateQueries({ queryKey: ["my-deposit-addresses"] }); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  async function openQr(addr: any) {
    if (!addr.qr_image_path) { setViewer({ ...addr, signedUrl: null }); return; }
    const { data } = await supabase.storage.from("deposit-qr").createSignedUrl(addr.qr_image_path, 300);
    setViewer({ ...addr, signedUrl: data?.signedUrl ?? null });
  }
  function copy(text: string) { navigator.clipboard.writeText(text); toast.success(t("wallet.copied")); }
  return (
    <div className="space-y-3">
      <div className="rounded-sm border border-dashed border-border p-3">
        <Label className="text-xs uppercase text-muted-foreground">{t("wallet.chooseCurrency")}</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Select value={currencyId} onValueChange={setCurrencyId}>
            <SelectTrigger className="flex-1"><SelectValue placeholder={t("wallet.select")} /></SelectTrigger>
            <SelectContent>
              {currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.symbol} — {c.name} ({c.network})</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => request.mutate()} disabled={!currencyId || request.isPending}>{t("wallet.requestAddress")}</Button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{t("wallet.requestHint")}</p>
      </div>
      <div className="space-y-2">
        <div className="text-xs uppercase text-muted-foreground">{t("wallet.myAddresses")}</div>
        {!my?.length && <div className="rounded-md bg-surface-elevated p-4 text-sm text-muted-foreground text-center">{t("wallet.noAddresses")}</div>}
        {my?.map((a) => (
          <div key={a.id} className="rounded-sm border border-border bg-surface-elevated p-3 space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-semibold">{a.currencies?.symbol}</span>
                <span className="truncate text-xs text-muted-foreground">{a.currencies?.name}</span>
                {a.network && <span className="text-[10px] px-2 py-0.5 rounded-sm bg-primary/15 text-primary">{a.network}</span>}
              </div>
              {a.status === "ready"
                ? <span className="text-[10px] px-2 py-0.5 rounded-sm bg-up/20 text-up">{t("wallet.ready")}</span>
                : <span className="text-[10px] px-2 py-0.5 rounded-sm bg-warning/20 text-warning flex items-center gap-1"><Clock className="h-3 w-3" />{t("wallet.waitingAdmin")}</span>}
            </div>
            {a.status === "ready" ? (
              <>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-sm bg-background px-2 py-1.5 text-xs font-mono break-all">{a.address}</code>
                  <Button size="icon" variant="ghost" onClick={() => copy(a.address)}><Copy className="h-4 w-4" /></Button>
                </div>
                {a.memo_tag && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{t("wallet.memoTag")}:</span>
                    <code className="rounded-sm bg-background px-2 py-0.5 font-mono">{a.memo_tag}</code>
                    <Button size="icon" variant="ghost" onClick={() => copy(a.memo_tag)}><Copy className="h-3 w-3" /></Button>
                  </div>
                )}
                {a.qr_image_path && (
                  <Button size="sm" variant="outline" onClick={() => openQr(a)}><QrCode className="h-4 w-4 mr-1" /> {t("wallet.seeQr")}</Button>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">{t("wallet.willNotify")}</p>
            )}
          </div>
        ))}
      </div>
      {viewer && (
        <Dialog open onOpenChange={(o) => !o && setViewer(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>QR · {viewer.currencies?.symbol}</DialogTitle></DialogHeader>
            {viewer.signedUrl ? <img src={viewer.signedUrl} alt="QR" className="mx-auto max-h-80 rounded-sm bg-background p-2" /> : <p className="text-sm text-muted-foreground">—</p>}
            <div className="text-xs font-mono break-all text-center">{viewer.address}</div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function SendPanel({ wallets, onDone }: { wallets: any[]; onDone: () => void }) {
  const { t } = useTranslation();
  const [currencyId, setCurrencyId] = useState("");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const funded = wallets.filter((w) => Number(w.available) > 0);
  async function submit() {
    if (!currencyId || !amount || !address) return toast.error(t("wallet.fillAll"));
    setLoading(true);
    try {
      const { error } = await supabase.rpc("request_withdrawal", { _currency_id: currencyId, _amount: Number(amount), _address: address });
      if (error) throw error;
      toast.success(t("wallet.sendRequested"));
      setAmount(""); setAddress(""); onDone();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }
  return (
    <div className="space-y-3">
      <div>
        <Label>{t("wallet.currency")}</Label>
        <Select value={currencyId} onValueChange={setCurrencyId}>
          <SelectTrigger><SelectValue placeholder={t("wallet.chooseFunded")} /></SelectTrigger>
          <SelectContent>
            {funded.map((w) => <SelectItem key={w.currency_id} value={w.currency_id}>{w.currencies?.symbol} — {Number(w.available).toFixed(6)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div><Label>{t("common.amount")}</Label><Input type="number" step="0.00000001" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div className="flex items-end">
          {currencyId && <Button variant="ghost" size="sm" onClick={() => { const w = funded.find((x) => x.currency_id === currencyId); if (w) setAmount(String(w.available)); }}>{t("wallet.max")}</Button>}
        </div>
      </div>
      <div><Label>{t("wallet.destAddress")}</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x... / bc1..." /></div>
      <Button onClick={submit} disabled={loading} className="w-full">{loading ? t("common.sending") : t("common.send")}</Button>
    </div>
  );
}

function SwapPanel({ wallets, currencies, prices, onDone }: { wallets: any[]; currencies: any[]; prices: any; onDone: () => void }) {
  const { t } = useTranslation();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const funded = wallets.filter((w) => Number(w.available) > 0);
  const fromCur = currencies.find((c) => c.id === fromId);
  const toCur = currencies.find((c) => c.id === toId);
  const fromPrice = fromCur?.coingecko_id ? prices[fromCur.coingecko_id]?.usd ?? 0 : fromCur?.symbol === "USDT" ? 1 : 0;
  const toPrice = toCur?.coingecko_id ? prices[toCur.coingecko_id]?.usd ?? 0 : toCur?.symbol === "USDT" ? 1 : 0;
  const rate = fromPrice && toPrice ? fromPrice / toPrice : 0;
  const receive = Number(amount || 0) * rate;
  async function submit() {
    if (!fromId || !toId || !amount) return toast.error(t("wallet.fillAll"));
    if (fromId === toId) return toast.error(t("wallet.diffCurrency"));
    if (!rate) return toast.error(t("wallet.noQuote"));
    setLoading(true);
    try {
      const { error } = await supabase.rpc("client_swap" as any, { _from_currency: fromId, _to_currency: toId, _from_amount: Number(amount), _rate: rate });
      if (error) throw error;
      toast.success(t("wallet.swapDone")); setAmount(""); onDone();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }
  return (
    <div className="space-y-3">
      <div>
        <Label>{t("wallet.youPay")}</Label>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <Input type="number" step="0.00000001" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1" />
          <Select value={fromId} onValueChange={setFromId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{funded.map((w) => <SelectItem key={w.currency_id} value={w.currency_id}>{w.currencies?.symbol}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-center"><ArrowLeftRight className="h-5 w-5 text-primary rotate-90" /></div>
      <div>
        <Label>{t("wallet.youReceive")}</Label>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <Input value={receive ? receive.toFixed(8) : ""} readOnly placeholder="0.00" className="flex-1" />
          <Select value={toId} onValueChange={setToId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{currencies.filter((c) => c.id !== fromId).map((c) => <SelectItem key={c.id} value={c.id}>{c.symbol}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      {rate > 0 && (
        <div className="rounded-md bg-surface-elevated p-3 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">{t("wallet.rate")}</span><span>1 {fromCur?.symbol} = {rate.toFixed(8)} {toCur?.symbol}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("wallet.price")} {fromCur?.symbol}</span><span>${fromPrice.toFixed(4)}</span></div>
        </div>
      )}
      <Button onClick={submit} disabled={loading || !rate} className="w-full">{loading ? t("common.processing") : t("wallet.confirmSwap")}</Button>
    </div>
  );
}

function WithdrawPanel({ wallets, prices, onDone }: { wallets: any[]; prices: any; onDone: () => void }) {
  const { t } = useTranslation();
  const [currencyId, setCurrencyId] = useState("");
  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState("");
  const [insurance, setInsurance] = useState(false);
  const [loading, setLoading] = useState(false);
  const funded = wallets.filter((w) => Number(w.available) > 0);
  const { data: banks } = useQuery({
    queryKey: ["my-banks"],
    queryFn: async () => (await supabase.from("bank_accounts" as any).select("*")).data as any[] ?? [],
  });
  const cur = funded.find((w) => w.currency_id === currencyId);
  const price = cur?.currencies?.coingecko_id ? prices[cur.currencies.coingecko_id]?.usd ?? 0 : cur?.currencies?.symbol === "USDT" ? 1 : 0;
  const usdTotal = Number(amount || 0) * price;
  const conversionFeeRate = 0.035;
  const conversionFee = usdTotal * conversionFeeRate;
  const netUsd = Math.max(usdTotal - conversionFee, 0);

  async function submit() {
    if (!currencyId || !amount) return toast.error(t("wallet.fillFields"));
    if (!bankId) return toast.error(t("wallet.noBank"));
    setLoading(true);
    try {
      const marker = insurance ? "[INSURANCE_QUOTE_REQUESTED] " : "";
      const { error } = await supabase.rpc("request_withdrawal", { _currency_id: currencyId, _amount: Number(amount), _address: `${marker}BANK:${bankId}` });
      if (error) throw error;
      toast.success(t("wallet.withdrawalRequested"));
      setAmount(""); setInsurance(false); onDone();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }
  return (
    <div className="space-y-3">
      <div>
        <Label>{t("wallet.asset")}</Label>
        <Select value={currencyId} onValueChange={setCurrencyId}>
          <SelectTrigger><SelectValue placeholder={t("wallet.chooseAsset")} /></SelectTrigger>
          <SelectContent>{funded.map((w) => <SelectItem key={w.currency_id} value={w.currency_id}>{w.currencies?.symbol} — {Number(w.available).toFixed(6)}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>{t("common.amount")}</Label>
        <Input type="number" step="0.00000001" value={amount} onChange={(e) => setAmount(e.target.value)} />
        {price > 0 && (
          <div className="mt-2 space-y-0.5 rounded-sm border border-border bg-surface-elevated p-2 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">≈</span><span className="font-mono">${usdTotal.toFixed(2)} USD</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("wallet.conversionFee")} (3.5%)</span><span className="font-mono text-down">−${conversionFee.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold"><span>{t("wallet.netReceive")}</span><span className="font-mono">${netUsd.toFixed(2)}</span></div>
          </div>
        )}
      </div>
      <div>
        <Label>{t("wallet.bankAccount")}</Label>
        {banks && banks.length > 0 ? (
          <Select value={bankId} onValueChange={setBankId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{banks.map((b) => <SelectItem key={b.id} value={b.id}>{b.bank_name} · •••• {b.last4}</SelectItem>)}</SelectContent>
          </Select>
        ) : (
          <div className="rounded-sm border border-dashed border-border p-3 text-xs text-muted-foreground text-center">{t("wallet.noBank")}</div>
        )}
      </div>
      <label className="flex items-start gap-2 rounded-sm border border-border bg-surface-elevated p-3 cursor-pointer">
        <input type="checkbox" checked={insurance} onChange={(e) => setInsurance(e.target.checked)} className="mt-0.5" />
        <div className="text-xs">
          <div className="font-medium">{t("wallet.insuranceQuote")}</div>
          <div className="text-muted-foreground">{t("wallet.insuranceQuoteHint")}</div>
        </div>
      </label>
      <Button onClick={submit} disabled={loading || !banks?.length} className="w-full">{loading ? t("common.sending") : t("wallet.requestWithdrawal")}</Button>
    </div>
  );
}
