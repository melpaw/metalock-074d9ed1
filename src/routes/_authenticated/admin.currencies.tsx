import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/currencies")({
  component: CurrenciesPage,
});

function CurrenciesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-currencies"],
    queryFn: async () => (await supabase.from("currencies").select("*").order("symbol")).data ?? [],
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("currencies").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-currencies"] }); toast.success("Atualizado"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Criptomoedas</h1>
          <p className="text-sm text-muted-foreground">{data?.length ?? 0} moedas cadastradas</p>
        </div>
        <CurrencyDialog onDone={() => qc.invalidateQueries({ queryKey: ["admin-currencies"] })} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {data?.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{c.symbol}</span>
                  <span className="text-xs text-muted-foreground">{c.network}</span>
                </div>
                <div className="text-sm text-muted-foreground">{c.name}</div>
              </div>
              <Switch checked={c.active} onCheckedChange={(v) => toggle.mutate({ id: c.id, active: v })} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Min. depósito:</span> <span className="tabular-nums">{c.min_deposit}</span></div>
              <div><span className="text-muted-foreground">Min. saque:</span> <span className="tabular-nums">{c.min_withdraw}</span></div>
              <div><span className="text-muted-foreground">Taxa saque:</span> <span className="tabular-nums">{c.withdraw_fee}</span></div>
              <div><span className="text-muted-foreground">Decimais:</span> <span className="tabular-nums">{c.decimals}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CurrencyDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ symbol: "", name: "", network: "", coingecko_id: "", decimals: 8 });
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const { error } = await supabase.from("currencies").insert(form);
      if (error) throw error;
      toast.success("Moeda criada");
      setOpen(false); setForm({ symbol: "", name: "", network: "", coingecko_id: "", decimals: 8 }); onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova moeda</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova criptomoeda</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Símbolo</Label><Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} /></div>
          <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Rede</Label><Input value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} /></div>
          <div className="space-y-2"><Label>CoinGecko ID</Label><Input value={form.coingecko_id} onChange={(e) => setForm({ ...form, coingecko_id: e.target.value })} /></div>
          <div className="space-y-2"><Label>Decimais</Label><Input type="number" value={form.decimals} onChange={(e) => setForm({ ...form, decimals: Number(e.target.value) })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
