import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/app/wallet")({
  component: WalletPage,
});

function WalletPage() {
  const qc = useQueryClient();
  const { data: wallets } = useQuery({
    queryKey: ["my-wallets"],
    queryFn: async () => (await supabase.from("wallets").select("*, currencies(*)").order("available", { ascending: false })).data ?? [],
  });
  const { data: currencies } = useQuery({
    queryKey: ["currencies-active"],
    queryFn: async () => (await supabase.from("currencies").select("*").eq("active", true)).data ?? [],
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["my-wallets"] });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Carteira</h1>
          <p className="text-sm text-muted-foreground">Deposite, saque e gerencie seus ativos</p>
        </div>
        <div className="flex gap-2">
          <DepositDialog currencies={currencies ?? []} onDone={refresh} />
          <WithdrawDialog wallets={wallets ?? []} onDone={refresh} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Ativo</th>
              <th className="px-4 py-3 text-right">Disponível</th>
              <th className="px-4 py-3 text-right">Bloqueado</th>
              <th className="px-4 py-3 text-right">Rede</th>
            </tr>
          </thead>
          <tbody>
            {wallets?.map((w: any) => (
              <tr key={w.id} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{w.currencies?.symbol}</div>
                  <div className="text-xs text-muted-foreground">{w.currencies?.name}</div>
                </td>
                <td className="px-4 py-3 text-right font-mono">{Number(w.available).toFixed(8)}</td>
                <td className="px-4 py-3 text-right font-mono text-warning">{Number(w.locked).toFixed(8)}</td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">{w.currencies?.network}</td>
              </tr>
            ))}
            {wallets?.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Nenhum saldo ainda. Faça um depósito para começar.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DepositDialog({ currencies, onDone }: { currencies: any[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [currencyId, setCurrencyId] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!currencyId || !amount) return toast.error("Preencha todos os campos");
    setLoading(true);
    try {
      const { error } = await supabase.rpc("request_deposit", {
        _currency_id: currencyId, _amount: Number(amount), _tx_hash: txHash || null as any,
      });
      if (error) throw error;
      toast.success("Depósito solicitado. Aguarde aprovação.");
      setOpen(false); setAmount(""); setTxHash(""); onDone();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><ArrowDownToLine className="mr-2 h-4 w-4" /> Depositar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Solicitar depósito</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Moeda</Label>
            <Select value={currencyId} onValueChange={setCurrencyId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.symbol} — {c.name} ({c.network})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Valor</Label>
            <Input type="number" step="0.00000001" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2"><Label>Hash da transação (opcional)</Label>
            <Input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x..." />
          </div>
          <p className="text-xs text-muted-foreground">Um administrador irá revisar e creditar seu saldo.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "Enviando..." : "Solicitar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawDialog({ wallets, onDone }: { wallets: any[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [currencyId, setCurrencyId] = useState("");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!currencyId || !amount || !address) return toast.error("Preencha todos os campos");
    setLoading(true);
    try {
      const { error } = await supabase.rpc("request_withdrawal", {
        _currency_id: currencyId, _amount: Number(amount), _address: address,
      });
      if (error) throw error;
      toast.success("Saque solicitado. Aguarde aprovação.");
      setOpen(false); setAmount(""); setAddress(""); onDone();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><ArrowUpFromLine className="mr-2 h-4 w-4" /> Sacar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Solicitar saque</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Moeda</Label>
            <Select value={currencyId} onValueChange={setCurrencyId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{wallets.filter(w => Number(w.available) > 0).map((w) => <SelectItem key={w.currency_id} value={w.currency_id}>{w.currencies?.symbol} — disp: {Number(w.available).toFixed(6)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Valor</Label>
            <Input type="number" step="0.00000001" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2"><Label>Endereço de destino</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x... ou bc1..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "Enviando..." : "Solicitar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
