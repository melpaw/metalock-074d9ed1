import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Snowflake, Ban, CheckCircle2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: currencies } = useQuery({
    queryKey: ["currencies"],
    queryFn: async () => (await supabase.from("currencies").select("*").eq("active", true)).data ?? [],
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "frozen" | "blocked" }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        action: "set_user_status", target_type: "user", target_id: id, metadata: { status },
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Status atualizado"); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = users?.filter((u) =>
    !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">{users?.length ?? 0} usuários no sistema</p>
        </div>
        <Input placeholder="Buscar por email ou nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Usuário</th>
                <th className="px-4 py-3 text-left font-medium">Papel</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Criado em</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((u: any) => (
                <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-surface-elevated/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {u.user_roles?.map((r: any) => (
                      <Badge key={r.role} variant="outline" className="mr-1 capitalize">{r.role}</Badge>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      {u.status !== "frozen" && (
                        <Button size="icon" variant="ghost" title="Congelar" onClick={() => setStatus.mutate({ id: u.id, status: "frozen" })}>
                          <Snowflake className="h-4 w-4" />
                        </Button>
                      )}
                      {u.status !== "blocked" && (
                        <Button size="icon" variant="ghost" title="Bloquear" onClick={() => setStatus.mutate({ id: u.id, status: "blocked" })}>
                          <Ban className="h-4 w-4 text-down" />
                        </Button>
                      )}
                      {u.status !== "active" && (
                        <Button size="icon" variant="ghost" title="Ativar" onClick={() => setStatus.mutate({ id: u.id, status: "active" })}>
                          <CheckCircle2 className="h-4 w-4 text-up" />
                        </Button>
                      )}
                      <AdjustBalanceDialog userId={u.id} email={u.email} currencies={currencies ?? []} onDone={() => qc.invalidateQueries({ queryKey: ["admin-users"] })} />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered?.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-up/20 text-up border-up/30",
    frozen: "bg-warning/20 text-warning border-warning/30",
    blocked: "bg-down/20 text-down border-down/30",
  };
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${map[status] ?? ""}`}>{status}</span>;
}

function AdjustBalanceDialog({ userId, email, currencies, onDone }: { userId: string; email: string; currencies: any[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [currencyId, setCurrencyId] = useState<string>("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!currencyId || !delta) return toast.error("Preencha todos os campos");
    setLoading(true);
    try {
      const { error } = await supabase.rpc("admin_adjust_balance", {
        _user_id: userId, _currency_id: currencyId, _delta: Number(delta), _reason: reason || "manual",
      });
      if (error) throw error;
      toast.success("Saldo ajustado");
      setOpen(false); setDelta(""); setReason(""); onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Ajustar saldo"><Wallet className="h-4 w-4 text-primary" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar saldo</DialogTitle>
          <p className="text-sm text-muted-foreground">{email}</p>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Moeda</Label>
            <Select value={currencyId} onValueChange={setCurrencyId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.symbol} — {c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor (use negativo para debitar)</Label>
            <Input type="number" step="0.00000001" value={delta} onChange={(e) => setDelta(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ex: bônus de boas-vindas" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "Aguarde..." : "Confirmar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
