import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/invest")({
  component: InvestPage,
});

function InvestPage() {
  const qc = useQueryClient();
  const { data: plans } = useQuery({
    queryKey: ["plans-active"],
    queryFn: async () => (await supabase.from("plans").select("*").eq("active", true).order("min_amount")).data ?? [],
  });
  const { data: investments } = useQuery({
    queryKey: ["my-investments-all"],
    queryFn: async () => (await supabase.from("investments").select("*, plans(name), currencies(symbol)").order("created_at",{ascending:false})).data ?? [],
  });
  const { data: wallets } = useQuery({
    queryKey: ["my-wallets"],
    queryFn: async () => (await supabase.from("wallets").select("*, currencies(*)")).data ?? [],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Investir</h1>
        <p className="text-sm text-muted-foreground">Escolha um plano e aloque seu saldo</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Planos disponíveis</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans?.map((p: any) => (
            <div key={p.id} className="rounded-xl border border-border bg-surface p-5 flex flex-col">
              <div className="flex items-center gap-2 text-primary"><TrendingUp className="h-5 w-5" /><span className="font-bold">{p.name}</span></div>
              <div className="mt-3 text-3xl font-bold">{p.daily_rate}<span className="text-base text-muted-foreground">%/dia</span></div>
              <div className="mt-2 text-xs text-muted-foreground">
                Min: {p.min_amount} · Max: {p.max_amount}<br />Duração: {p.duration_days} dias
              </div>
              <InvestDialog plan={p} wallets={wallets ?? []} onDone={() => qc.invalidateQueries()} />
            </div>
          ))}
          {plans?.length === 0 && <div className="text-muted-foreground col-span-full text-center py-8">Nenhum plano disponível.</div>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Meus investimentos</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Plano</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Taxa</th>
                <th className="px-4 py-3 text-right">Encerra</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {investments?.map((i: any) => (
                <tr key={i.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3">{i.plans?.name}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(i.amount).toFixed(4)} {i.currencies?.symbol}</td>
                  <td className="px-4 py-3 text-right">{i.daily_rate}%/dia</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{new Date(i.end_date).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3 capitalize">{i.status}</td>
                </tr>
              ))}
              {investments?.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Nenhum investimento ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function InvestDialog({ plan, wallets, onDone }: { plan: any; wallets: any[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [currencyId, setCurrencyId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!currencyId || !amount) return toast.error("Preencha todos os campos");
    setLoading(true);
    try {
      const { error } = await supabase.rpc("invest_in_plan", {
        _plan_id: plan.id, _currency_id: currencyId, _amount: Number(amount),
      });
      if (error) throw error;
      toast.success("Investimento criado!");
      setOpen(false); setAmount(""); onDone();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="mt-4 w-full">Investir</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Investir em {plan.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Moeda</Label>
            <Select value={currencyId} onValueChange={setCurrencyId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{wallets.filter(w => Number(w.available) > 0).map((w) => <SelectItem key={w.currency_id} value={w.currency_id}>{w.currencies?.symbol} — disp: {Number(w.available).toFixed(6)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Valor ({plan.min_amount} – {plan.max_amount})</Label>
            <Input type="number" step="0.00000001" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "..." : "Confirmar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
