import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { AgentPermissionsDialog } from "@/components/AgentPermissionsDialog";

export const Route = createFileRoute("/_authenticated/admin/team")({
  component: TeamPage,
});

function TeamPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: users } = useQuery({
    queryKey: ["team-users"],
    queryFn: async () => (await supabase.from("profiles").select("*, user_roles(role)").order("created_at",{ascending:false})).data ?? [],
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "agent" | "client" }) => {
      const { error } = await supabase.rpc("admin_set_role", { _user_id: userId, _role: role });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["team-users"] }); toast.success("Função atualizada"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = users?.filter((u: any) =>
    !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipe & Permissões</h1>
          <p className="text-sm text-muted-foreground">Promova usuários a agentes ou administradores</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <Button onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4 mr-1" /> Adicionar agente</Button>
        </div>
      </div>

      <AddAgentDialog open={addOpen} onClose={() => setAddOpen(false)} onDone={() => qc.invalidateQueries({ queryKey: ["team-users"] })} />


      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Usuário</th>
              <th className="px-4 py-3 text-left">Função atual</th>
              <th className="px-4 py-3 text-right">Alterar</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.map((u: any) => {
              const currentRole = u.user_roles?.[0]?.role ?? "client";
              return (
                <tr key={u.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`capitalize ${
                      currentRole === "admin" ? "border-primary/40 text-primary" :
                      currentRole === "agent" ? "border-warning/40 text-warning" : ""
                    }`}>{currentRole}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2 items-center">
                      <Select value={currentRole} onValueChange={(v: any) => setRole.mutate({ userId: u.id, role: v })}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">Cliente</SelectItem>
                          <SelectItem value="agent">Agente</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {currentRole === "agent" && <AgentPermissionsDialog agentId={u.id} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddAgentDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim()) return toast.error("Informe o e-mail");
    setLoading(true);
    try {
      const { data: userId, error } = await supabase.rpc("admin_register_client" as any, { _email: email.trim() });
      if (error) throw error;
      if (!userId) throw new Error("Usuário não encontrado. Peça para ele criar uma conta primeiro.");
      const { error: e2 } = await supabase.rpc("admin_set_role", { _user_id: userId, _role: "agent" });
      if (e2) throw e2;
      toast.success("Agente adicionado com sucesso");
      setEmail(""); onDone(); onClose();
    } catch (e: any) {
      toast.error(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Adicionar agente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>E-mail do usuário</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="agente@exemplo.com" />
            <p className="mt-1 text-xs text-muted-foreground">O usuário precisa ter uma conta criada. A função dele será alterada para Agente.</p>
          </div>
          <Button onClick={submit} disabled={loading} className="w-full">
            {loading ? "Adicionando..." : "Adicionar agente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
