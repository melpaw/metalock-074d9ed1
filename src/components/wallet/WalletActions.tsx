import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownToLine, Send, ArrowLeftRight, Building2, Copy, QrCode, Clock, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
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

function SendPanel({ wallets, currencies, onDone }: { wallets: any[]; currencies: any[]; onDone: () => void }) {
  const { t } = useTranslation();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const funded = wallets.filter((w) => Number(w.available) > 0);
  async function submit() {
    if (!fromId || !toId || !amount) return toast.error(t("wallet.fillAll"));
    if (fromId === toId) return toast.error(t("wallet.diffCurrency"));
    setLoading(true);
    try {
      const { error } = await supabase.rpc("client_internal_transfer" as any, { _from_currency: fromId, _to_currency: toId, _amount: Number(amount) });
      if (error) throw error;
      toast.success(t("wallet.transferDone"));
      setAmount(""); onDone();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }
  return (
    <div className="space-y-3">
      <div className="rounded-sm border border-dashed border-border p-2 text-xs text-muted-foreground">
        {t("wallet.internalTransferHint")}
      </div>
      <div>
        <Label>{t("wallet.fromWallet")}</Label>
        <Select value={fromId} onValueChange={setFromId}>
          <SelectTrigger><SelectValue placeholder={t("wallet.chooseFunded")} /></SelectTrigger>
          <SelectContent>
            {funded.map((w) => <SelectItem key={w.currency_id} value={w.currency_id}>{w.currencies?.symbol} — {Number(w.available).toFixed(6)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>{t("wallet.toWallet")}</Label>
        <Select value={toId} onValueChange={setToId}>
          <SelectTrigger><SelectValue placeholder={t("wallet.select")} /></SelectTrigger>
          <SelectContent>
            {currencies.filter((c) => c.id !== fromId).map((c) => <SelectItem key={c.id} value={c.id}>{c.symbol} — {c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div><Label>{t("common.amount")}</Label><Input type="number" step="0.00000001" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div className="flex items-end">
          {fromId && <Button variant="ghost" size="sm" onClick={() => { const w = funded.find((x) => x.currency_id === fromId); if (w) setAmount(String(w.available)); }}>{t("wallet.max")}</Button>}
        </div>
      </div>
      <Button onClick={submit} disabled={loading} className="w-full">{loading ? t("common.sending") : t("wallet.confirmTransfer")}</Button>
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
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [currencyId, setCurrencyId] = useState("");
  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState("");
  const [bankFormOpen, setBankFormOpen] = useState(false);
  const [editBank, setEditBank] = useState<any | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [fiat, setFiat] = useState<"USD" | "BRL" | "EUR">("USD");
  const [processing, setProcessing] = useState(false);
  const funded = wallets.filter((w) => Number(w.available) > 0);
  const { data: banks, refetch: refetchBanks } = useQuery({
    queryKey: ["my-banks"],
    queryFn: async () => (await supabase.from("bank_accounts" as any).select("*").order("created_at", { ascending: false })).data as any[] ?? [],
  });
  const cur = funded.find((w) => w.currency_id === currencyId);
  const livePrice = cur?.currencies?.coingecko_id ? prices[cur.currencies.coingecko_id]?.usd ?? 0 : 0;
  const dbPrice = Number(cur?.currencies?.usd_price ?? 0);
  const stableGuess = ["USDT", "USDC", "DAI", "BUSD", "TUSD", "USD"].includes(cur?.currencies?.symbol) ? 1 : 0;
  const price = livePrice > 0 ? livePrice : dbPrice > 0 ? dbPrice : stableGuess;
  const usdTotal = Number(amount || 0) * price;
  const feeUsd = usdTotal * 0.025;
  const selectedBank = banks?.find((b) => b.id === bankId);

  function openWithdraw() {
    if (!currencyId || !amount) return toast.error(t("wallet.fillFields"));
    if (!bankId) return toast.error(t("wallet.selectBank"));
    if (Number(amount) <= 0) return toast.error(t("wallet.invalidAmount"));
    setConvertOpen(true);
  }

  async function confirmAndOpenTicket() {
    setProcessing(true);
    try {
      const { data: txId, error } = await supabase.rpc("client_request_bank_withdrawal" as any, {
        _currency_id: currencyId,
        _amount: Number(amount),
        _bank_id: bankId,
        _fiat_currency: fiat,
      });
      if (error) throw error;
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("no user");
      const shortId = String(txId).slice(0, 8);
      const subject = t("wallet.feeTicketSubject", { id: shortId });
      const body = t("wallet.feeTicketBody", {
        id: shortId,
        amount: `${Number(amount).toFixed(8)} ${cur?.currencies?.symbol ?? ""}`,
        fiat,
        fee: `$${feeUsd.toFixed(2)} USD`,
      });
      const { data: ticket, error: tErr } = await supabase.from("support_tickets")
        .insert({ user_id: userRes.user.id, subject, category: "withdrawal", priority: "high" })
        .select().single();
      if (tErr) throw tErr;
      await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id, sender_id: userRes.user.id, body,
      });
      toast.success(t("wallet.withdrawalRequested"));
      setConvertOpen(false); setAmount(""); onDone();
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
      navigate({ to: "/app/support/$ticketId", params: { ticketId: ticket.id } });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Bank accounts section */}
      <div className="rounded-sm border border-border bg-surface-elevated p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase text-muted-foreground">{t("wallet.bankAccounts")}</Label>
          <Button size="sm" variant="outline" onClick={() => { setEditBank(null); setBankFormOpen(true); }}>
            <Plus className="h-3 w-3 mr-1" /> {t("wallet.addBank")}
          </Button>
        </div>
        {!banks?.length && (
          <div className="rounded-sm border border-dashed border-border p-4 text-xs text-muted-foreground text-center">
            {t("wallet.noBankYet")}
          </div>
        )}
        {banks?.map((b) => (
          <label key={b.id} className={`flex items-center gap-2 rounded-sm border p-2 cursor-pointer transition ${bankId === b.id ? "border-primary bg-primary/5" : "border-border"}`}>
            <input type="radio" name="bankId" checked={bankId === b.id} onChange={() => setBankId(b.id)} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{b.bank_name} <span className="text-xs text-muted-foreground">· {b.country}</span></div>
              <div className="text-xs text-muted-foreground truncate">{b.account_holder} · IBAN {b.iban || `•••• ${b.last4}`}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={(e) => { e.preventDefault(); setEditBank(b); setBankFormOpen(true); }}><Pencil className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" onClick={async (e) => {
              e.preventDefault();
              if (!confirm(t("wallet.confirmDeleteBank"))) return;
              const { error } = await supabase.from("bank_accounts" as any).delete().eq("id", b.id);
              if (error) return toast.error(error.message);
              if (bankId === b.id) setBankId("");
              toast.success(t("common.deleted"));
              refetchBanks();
            }}><Trash2 className="h-3 w-3 text-down" /></Button>
          </label>
        ))}
      </div>

      {/* Amount section - only if bank selected */}
      {bankId && (
        <>
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
              <div className="mt-2 rounded-sm border border-border bg-surface-elevated p-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">≈</span><span className="font-mono">${usdTotal.toFixed(2)} USD</span></div>
              </div>
            )}
          </div>
          <Button onClick={openWithdraw} className="w-full">{t("wallet.requestWithdrawal")}</Button>
        </>
      )}

      {/* Bank form dialog */}
      <BankFormDialog
        open={bankFormOpen}
        onClose={() => setBankFormOpen(false)}
        bank={editBank}
        onSaved={() => { setBankFormOpen(false); refetchBanks(); }}
      />

      {/* Currency conversion dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("wallet.conversionTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-sm border border-border bg-surface-elevated p-3 space-y-1">
              <Row label={t("wallet.sourceCurrency")} value={`${Number(amount || 0).toFixed(8)} ${cur?.currencies?.symbol ?? ""}`} />
              <Row label={t("wallet.requestedAmount")} value={`$${usdTotal.toFixed(2)} USD`} />
            </div>
            <div>
              <Label>{t("wallet.destinationCurrency")}</Label>
              <Select value={fiat} onValueChange={(v) => setFiat(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD — {t("wallet.usd")}</SelectItem>
                  <SelectItem value="BRL">BRL — {t("wallet.brl")}</SelectItem>
                  <SelectItem value="EUR">EUR — {t("wallet.eur")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-sm border border-border bg-surface-elevated p-3 space-y-1">
              <Row label={`${t("wallet.conversionFee")} (2.5%)`} value={`-$${feeUsd.toFixed(2)} USD`} className="text-down" />
            </div>
            <div className="rounded-sm border border-warning/40 bg-warning/10 p-3 text-warning text-center text-xs flex gap-2 items-start">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{t("wallet.conversionWarning")}</span>
            </div>
            {selectedBank && (
              <div className="text-xs text-muted-foreground">
                {t("wallet.willSendTo")}: <span className="text-foreground">{selectedBank.bank_name} · {selectedBank.account_holder}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConvertOpen(false)} disabled={processing}>{t("common.cancel")}</Button>
            <Button onClick={confirmAndOpenTicket} disabled={processing}>{processing ? t("common.processing") : t("wallet.payConversionFee")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, className, bold }: { label: string; value: string; className?: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${className ?? ""}`}>{value}</span>
    </div>
  );
}

function BankFormDialog({ open, onClose, bank, onSaved }: { open: boolean; onClose: () => void; bank: any | null; onSaved: () => void }) {
  const { t } = useTranslation();
  const [holder, setHolder] = useState(bank?.account_holder ?? "");
  const [country, setCountry] = useState(bank?.country ?? "");
  const [bankName, setBankName] = useState(bank?.bank_name ?? "");
  const [iban, setIban] = useState(bank?.iban ?? "");
  const [saving, setSaving] = useState(false);

  // Reset when bank changes (dialog reopens)
  useEffect(() => {
    setHolder(bank?.account_holder ?? "");
    setCountry(bank?.country ?? "");
    setBankName(bank?.bank_name ?? "");
    setIban(bank?.iban ?? "");
  }, [bank?.id, open]);

  async function save() {
    if (!holder.trim() || !country.trim() || !bankName.trim() || !iban.trim()) {
      return toast.error(t("wallet.fillAll"));
    }
    setSaving(true);
    try {
      const clean = iban.replace(/\s+/g, "");
      const last4 = clean.slice(-4);
      if (bank?.id) {
        const { error } = await supabase.from("bank_accounts" as any).update({
          account_holder: holder.trim(), country: country.trim(), bank_name: bankName.trim(),
          iban: clean, last4, iban_masked: `•••• ${last4}`,
        }).eq("id", bank.id);
        if (error) throw error;
      } else {
        const { data: userRes } = await supabase.auth.getUser();
        if (!userRes.user) throw new Error("no user");
        const { error } = await supabase.from("bank_accounts" as any).insert({
          user_id: userRes.user.id,
          account_holder: holder.trim(), country: country.trim(), bank_name: bankName.trim(),
          iban: clean, last4, iban_masked: `•••• ${last4}`,
        });
        if (error) throw error;
      }
      toast.success(t("common.saved"));
      onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{bank ? t("wallet.editBank") : t("wallet.addBank")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("wallet.accountHolder")}</Label><Input value={holder} onChange={(e) => setHolder(e.target.value)} /></div>
          <div><Label>{t("wallet.bankCountry")}</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Brasil, Portugal, USA…" /></div>
          <div><Label>{t("wallet.bankName")}</Label><Input value={bankName} onChange={(e) => setBankName(e.target.value)} /></div>
          <div><Label>IBAN</Label><Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="BR00 0000 …" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
          <Button onClick={save} disabled={saving}>{saving ? "..." : t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
