import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  component: PlansPage,
});

function PlansPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => (await supabase.from("plans").select("*").order("min_amount")).data ?? [],
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("plans").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-plans"] }); toast.success("Atualizado"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planos de investimento</h1>
          <p className="text-sm text-muted-foreground">{data?.length ?? 0} planos disponíveis</p>
        </div>
        <PlanDialog onDone={() => qc.invalidateQueries({ queryKey: ["admin-plans"] })} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.map((p) => (
          <div key={p.id} className="rounded-sm border border-border bg-surface p-6 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 gradient-primary" />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-bold">{p.name}</div>
                <div className="text-sm text-muted-foreground">{p.description}</div>
              </div>
              <Switch checked={p.active} onCheckedChange={(v) => toggle.mutate({ id: p.id, active: v })} />
            </div>
            <div className="mt-6">
              <div className="text-3xl font-bold text-primary tabular-nums">{(Number(p.daily_rate) * 100).toFixed(2)}%</div>
              <div className="text-xs text-muted-foreground">ao dia por {p.duration_days} dias</div>
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Mínimo</span><span className="tabular-nums">${Number(p.min_amount).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Máximo</span><span className="tabular-nums">${Number(p.max_amount).toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-border pt-1 mt-2 font-semibold"><span>Rendimento total</span><span className="text-up tabular-nums">{(Number(p.daily_rate) * p.duration_days * 100).toFixed(1)}%</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", min_amount: 100, max_amount: 1000, daily_rate: 0.01, duration_days: 30 });
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const { error } = await supabase.from("plans").insert(form);
      if (error) throw error;
      toast.success("Plano criado");
      setOpen(false); onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo plano</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo plano de investimento</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-2 col-span-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="space-y-2"><Label>Valor mínimo</Label><Input type="number" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: Number(e.target.value) })} /></div>
          <div className="space-y-2"><Label>Valor máximo</Label><Input type="number" value={form.max_amount} onChange={(e) => setForm({ ...form, max_amount: Number(e.target.value) })} /></div>
          <div className="space-y-2"><Label>Taxa diária (0.01 = 1%)</Label><Input type="number" step="0.0001" value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: Number(e.target.value) })} /></div>
          <div className="space-y-2"><Label>Duração (dias)</Label><Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
