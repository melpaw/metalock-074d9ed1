import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMarketPrices } from "@/lib/prices.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownToLine, Send, ArrowLeftRight, Building2, Copy, QrCode, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/app/wallet")({
  component: WalletPage,
});

function WalletPage() {
  const qc = useQueryClient();
  const pricesFn = useServerFn(getMarketPrices);

  const { data: wallets } = useQuery({
    queryKey: ["my-wallets"],
    queryFn: async () => (await supabase.from("wallets").select("*, currencies(*)").order("available", { ascending: false })).data ?? [],
  });
  const { data: currencies } = useQuery({
    queryKey: ["currencies-active"],
    queryFn: async () => (await supabase.from("currencies").select("*").eq("active", true).order("symbol")).data ?? [],
  });

  const cgIds = useMemo(
    () => Array.from(new Set((currencies ?? []).map((c: any) => c.coingecko_id).filter(Boolean))) as string[],
    [currencies]
  );
  const { data: pricesRes } = useQuery({
    queryKey: ["wallet-prices", cgIds.join(",")],
    queryFn: () => pricesFn({ data: { ids: cgIds.length ? cgIds : ["bitcoin"] } }),
    enabled: cgIds.length > 0,
    refetchInterval: 60000,
  });
  const prices = (pricesRes as any)?.data ?? {};

  const priceOf = (c: any) => (c?.coingecko_id ? prices[c.coingecko_id]?.usd ?? 0 : c?.symbol === "USDT" ? 1 : 0);
  const change24h = (c: any) => (c?.coingecko_id ? prices[c.coingecko_id]?.usd_24h_change ?? 0 : 0);

  const totalUsd = (wallets ?? []).reduce((sum: number, w: any) => sum + Number(w.available) * priceOf(w.currencies), 0);
  const lockedUsd = (wallets ?? []).reduce((sum: number, w: any) => sum + Number(w.locked) * priceOf(w.currencies), 0);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["my-wallets"] });
    qc.invalidateQueries({ queryKey: ["my-deposit-addresses"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Carteira</h1>
        <p className="text-sm text-muted-foreground">Depósito, envio, swap e saque em um só lugar</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Balance summary */}
        <div className="lg:col-span-1 rounded-2xl border border-border bg-surface p-5 space-y-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Patrimônio total</div>
          <div className="text-3xl font-bold tabular-nums">
            ${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {lockedUsd > 0 && (
            <div className="text-xs text-warning">
              ${lockedUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })} bloqueados em ordens pendentes
            </div>
          )}
          <div className="text-xs text-muted-foreground">{wallets?.length ?? 0} moedas em carteira</div>
        </div>

        {/* Actions panel */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-5">
          <ActionPanel wallets={wallets ?? []} currencies={currencies ?? []} prices={prices} onDone={refresh} />
        </div>
      </div>

      {/* Currency list */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="border-b border-border px-5 py-3 text-sm font-semibold">Suas moedas</div>
        {(!wallets || wallets.length === 0) ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Nenhum saldo ainda. Solicite um endereço de depósito acima para começar.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {wallets.map((w: any) => {
              const p = priceOf(w.currencies);
              const chg = change24h(w.currencies);
              const total = Number(w.available) + Number(w.locked);
              return (
                <div key={w.id} className="grid grid-cols-12 items-center gap-3 px-5 py-3 text-sm">
                  <div className="col-span-4 sm:col-span-3">
                    <div className="font-semibold">{w.currencies?.symbol}</div>
                    <div className="text-xs text-muted-foreground truncate">{w.currencies?.name}</div>
                  </div>
                  <div className="col-span-4 sm:col-span-3 text-right sm:text-left">
                    <div className="tabular-nums">${p.toLocaleString("en-US", { maximumFractionDigits: 4 })}</div>
                    <div className={`text-xs tabular-nums flex items-center sm:justify-start justify-end gap-1 ${chg >= 0 ? "text-up" : "text-down"}`}>
                      {chg >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {chg.toFixed(2)}%
                    </div>
                  </div>
                  <div className="col-span-4 sm:col-span-3 text-right">
                    <div className="tabular-nums font-mono">{Number(w.available).toFixed(6)}</div>
                    {Number(w.locked) > 0 && (
                      <div className="text-xs text-warning tabular-nums">bloq {Number(w.locked).toFixed(6)}</div>
                    )}
                  </div>
                  <div className="hidden sm:block col-span-3 text-right">
                    <div className="tabular-nums font-semibold">
                      ${(total * p).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------- Action panel ------------------------- */
function ActionPanel({ wallets, currencies, prices, onDone }: { wallets: any[]; currencies: any[]; prices: any; onDone: () => void }) {
  return (
    <Tabs defaultValue="deposit" className="w-full">
      <TabsList className="grid grid-cols-4 w-full">
        <TabsTrigger value="deposit"><ArrowDownToLine className="h-4 w-4 mr-1" /> Depositar</TabsTrigger>
        <TabsTrigger value="send"><Send className="h-4 w-4 mr-1" /> Enviar</TabsTrigger>
        <TabsTrigger value="swap"><ArrowLeftRight className="h-4 w-4 mr-1" /> Swap</TabsTrigger>
        <TabsTrigger value="withdraw"><Building2 className="h-4 w-4 mr-1" /> Sacar</TabsTrigger>
      </TabsList>

      <TabsContent value="deposit" className="mt-4"><DepositPanel currencies={currencies} onDone={onDone} /></TabsContent>
      <TabsContent value="send" className="mt-4"><SendPanel wallets={wallets} onDone={onDone} /></TabsContent>
      <TabsContent value="swap" className="mt-4"><SwapPanel wallets={wallets} currencies={currencies} prices={prices} onDone={onDone} /></TabsContent>
      <TabsContent value="withdraw" className="mt-4"><WithdrawPanel wallets={wallets} prices={prices} onDone={onDone} /></TabsContent>
    </Tabs>
  );
}

/* ------------------------- Deposit ------------------------- */
function DepositPanel({ currencies, onDone }: { currencies: any[]; onDone: () => void }) {
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
    onSuccess: () => { toast.success("Solicitado. O admin cadastrará seu endereço em breve."); setCurrencyId(""); qc.invalidateQueries({ queryKey: ["my-deposit-addresses"] }); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  async function openQr(addr: any) {
    if (!addr.qr_image_path) { setViewer({ ...addr, signedUrl: null }); return; }
    const { data } = await supabase.storage.from("deposit-qr").createSignedUrl(addr.qr_image_path, 300);
    setViewer({ ...addr, signedUrl: data?.signedUrl ?? null });
  }

  function copy(text: string) { navigator.clipboard.writeText(text); toast.success("Copiado"); }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-border p-4">
        <Label className="text-xs uppercase text-muted-foreground">Escolha a moeda para receber</Label>
        <div className="mt-2 flex gap-2">
          <Select value={currencyId} onValueChange={setCurrencyId}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione uma moeda..." /></SelectTrigger>
            <SelectContent>
              {currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.symbol} — {c.name} ({c.network})</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => request.mutate()} disabled={!currencyId || request.isPending}>
            Solicitar endereço
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          O administrador cadastrará seu endereço exclusivo e o QR code para depósito.
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase text-muted-foreground">Meus endereços</div>
        {!my?.length && <div className="rounded-md bg-surface-elevated p-4 text-sm text-muted-foreground text-center">Nenhum endereço ainda.</div>}
        {my?.map((a) => (
          <div key={a.id} className="rounded-lg border border-border bg-surface-elevated p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{a.currencies?.symbol}</span>
                <span className="text-xs text-muted-foreground">{a.currencies?.name}</span>
                {a.network && <span className="text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary">{a.network}</span>}
              </div>
              {a.status === "ready"
                ? <span className="text-[10px] px-2 py-0.5 rounded bg-up/20 text-up">Pronto</span>
                : <span className="text-[10px] px-2 py-0.5 rounded bg-warning/20 text-warning flex items-center gap-1"><Clock className="h-3 w-3" />Aguardando admin</span>}
            </div>
            {a.status === "ready" ? (
              <>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-background px-2 py-1.5 text-xs font-mono break-all">{a.address}</code>
                  <Button size="icon" variant="ghost" onClick={() => copy(a.address)}><Copy className="h-4 w-4" /></Button>
                </div>
                {a.memo_tag && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Memo/Tag:</span>
                    <code className="rounded bg-background px-2 py-0.5 font-mono">{a.memo_tag}</code>
                    <Button size="icon" variant="ghost" onClick={() => copy(a.memo_tag)}><Copy className="h-3 w-3" /></Button>
                  </div>
                )}
                {a.qr_image_path && (
                  <Button size="sm" variant="outline" onClick={() => openQr(a)}>
                    <QrCode className="h-4 w-4 mr-1" /> Ver QR code
                  </Button>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Você será notificado assim que o endereço estiver pronto.</p>
            )}
          </div>
        ))}
      </div>

      {viewer && (
        <Dialog open onOpenChange={(o) => !o && setViewer(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>QR code · {viewer.currencies?.symbol}</DialogTitle></DialogHeader>
            {viewer.signedUrl ? (
              <img src={viewer.signedUrl} alt="QR" className="mx-auto max-h-80 rounded-lg bg-white p-2" />
            ) : <p className="text-sm text-muted-foreground">QR indisponível.</p>}
            <div className="text-xs font-mono break-all text-center">{viewer.address}</div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* ------------------------- Send (crypto to external) ------------------------- */
function SendPanel({ wallets, onDone }: { wallets: any[]; onDone: () => void }) {
  const [currencyId, setCurrencyId] = useState("");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const funded = wallets.filter((w) => Number(w.available) > 0);

  async function submit() {
    if (!currencyId || !amount || !address) return toast.error("Preencha todos os campos");
    setLoading(true);
    try {
      const { error } = await supabase.rpc("request_withdrawal", {
        _currency_id: currencyId, _amount: Number(amount), _address: address,
      });
      if (error) throw error;
      toast.success("Envio solicitado. Aguarde aprovação do admin.");
      setAmount(""); setAddress(""); onDone();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Moeda</Label>
        <Select value={currencyId} onValueChange={setCurrencyId}>
          <SelectTrigger><SelectValue placeholder="Escolha uma moeda com saldo..." /></SelectTrigger>
          <SelectContent>
            {funded.map((w) => (
              <SelectItem key={w.currency_id} value={w.currency_id}>
                {w.currencies?.symbol} — disp {Number(w.available).toFixed(6)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Valor</Label><Input type="number" step="0.00000001" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div className="flex items-end">
          {currencyId && (
            <Button variant="ghost" size="sm" onClick={() => {
              const w = funded.find((x) => x.currency_id === currencyId);
              if (w) setAmount(String(w.available));
            }}>Máx</Button>
          )}
        </div>
      </div>
      <div><Label>Endereço de destino</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x... ou bc1..." /></div>
      <Button onClick={submit} disabled={loading} className="w-full">{loading ? "Enviando..." : "Enviar"}</Button>
    </div>
  );
}

/* ------------------------- Swap ------------------------- */
function SwapPanel({ wallets, currencies, prices, onDone }: { wallets: any[]; currencies: any[]; prices: any; onDone: () => void }) {
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
    if (!fromId || !toId || !amount) return toast.error("Preencha todos os campos");
    if (fromId === toId) return toast.error("Escolha moedas diferentes");
    if (!rate) return toast.error("Cotação indisponível para este par");
    setLoading(true);
    try {
      const { error } = await supabase.rpc("client_swap" as any, {
        _from_currency: fromId, _to_currency: toId, _from_amount: Number(amount), _rate: rate,
      });
      if (error) throw error;
      toast.success("Swap concluído");
      setAmount(""); onDone();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Você paga</Label>
        <div className="flex gap-2">
          <Input type="number" step="0.00000001" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1" />
          <Select value={fromId} onValueChange={setFromId}>
            <SelectTrigger className="w-40"><SelectValue placeholder="De..." /></SelectTrigger>
            <SelectContent>
              {funded.map((w) => <SelectItem key={w.currency_id} value={w.currency_id}>{w.currencies?.symbol}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {fromId && (
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>≈ ${(Number(amount || 0) * fromPrice).toFixed(2)}</span>
            <button className="text-primary hover:underline" onClick={() => {
              const w = funded.find((x) => x.currency_id === fromId);
              if (w) setAmount(String(w.available));
            }}>MÁX {funded.find((x) => x.currency_id === fromId)?.available}</button>
          </div>
        )}
      </div>

      <div className="flex justify-center"><ArrowLeftRight className="h-5 w-5 text-primary rotate-90" /></div>

      <div>
        <Label>Você recebe</Label>
        <div className="flex gap-2">
          <Input value={receive ? receive.toFixed(8) : ""} readOnly placeholder="0.00" className="flex-1" />
          <Select value={toId} onValueChange={setToId}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Para..." /></SelectTrigger>
            <SelectContent>
              {currencies.filter((c) => c.id !== fromId).map((c) => <SelectItem key={c.id} value={c.id}>{c.symbol}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {rate > 0 && (
        <div className="rounded-md bg-surface-elevated p-3 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Cotação</span><span>1 {fromCur?.symbol} = {rate.toFixed(8)} {toCur?.symbol}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Preço {fromCur?.symbol}</span><span>${fromPrice.toFixed(4)}</span></div>
        </div>
      )}

      <Button onClick={submit} disabled={loading || !rate} className="w-full">{loading ? "Trocando..." : "Confirmar swap"}</Button>
    </div>
  );
}

/* ------------------------- Withdraw (bank) ------------------------- */
function WithdrawPanel({ wallets, prices, onDone }: { wallets: any[]; prices: any; onDone: () => void }) {
  const [currencyId, setCurrencyId] = useState("");
  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState("");
  const [loading, setLoading] = useState(false);
  const funded = wallets.filter((w) => Number(w.available) > 0);

  const { data: banks } = useQuery({
    queryKey: ["my-banks"],
    queryFn: async () => (await supabase.from("bank_accounts" as any).select("*")).data as any[] ?? [],
  });

  const cur = funded.find((w) => w.currency_id === currencyId);
  const price = cur?.currencies?.coingecko_id ? prices[cur.currencies.coingecko_id]?.usd ?? 0 : cur?.currencies?.symbol === "USDT" ? 1 : 0;
  const usdTotal = Number(amount || 0) * price;

  async function submit() {
    if (!currencyId || !amount) return toast.error("Preencha os campos");
    if (!bankId) return toast.error("Cadastre uma conta bancária primeiro");
    setLoading(true);
    try {
      const { error } = await supabase.rpc("request_withdrawal", {
        _currency_id: currencyId, _amount: Number(amount), _address: `BANK:${bankId}`,
      });
      if (error) throw error;
      toast.success("Saque solicitado. Aguarde aprovação.");
      setAmount(""); onDone();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Ativo</Label>
        <Select value={currencyId} onValueChange={setCurrencyId}>
          <SelectTrigger><SelectValue placeholder="Escolha o ativo..." /></SelectTrigger>
          <SelectContent>
            {funded.map((w) => (
              <SelectItem key={w.currency_id} value={w.currency_id}>{w.currencies?.symbol} — disp {Number(w.available).toFixed(6)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Valor</Label>
        <Input type="number" step="0.00000001" value={amount} onChange={(e) => setAmount(e.target.value)} />
        {price > 0 && <div className="mt-1 text-xs text-muted-foreground">≈ ${usdTotal.toFixed(2)} USD</div>}
      </div>
      <div>
        <Label>Conta bancária</Label>
        {banks && banks.length > 0 ? (
          <Select value={bankId} onValueChange={setBankId}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {banks.map((b) => <SelectItem key={b.id} value={b.id}>{b.bank_name} · •••• {b.last4}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground text-center">
            Nenhuma conta cadastrada. Abra um ticket no suporte para cadastrar sua conta.
          </div>
        )}
      </div>
      <Button onClick={submit} disabled={loading || !banks?.length} className="w-full">{loading ? "Enviando..." : "Solicitar saque"}</Button>
    </div>
  );
}
