import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { AgentPermissionsDialog } from "@/components/AgentPermissionsDialog";
import { UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/team")({
  component: TeamPage,
});

function TeamPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: users } = useQuery({
    queryKey: ["team-users"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at",{ascending:false}),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const roleByUser = new Map((rolesRes.data ?? []).map((r: any) => [r.user_id, r.role]));
      return (profilesRes.data ?? []).map((p: any) => ({ ...p, role: roleByUser.get(p.id) ?? "client" }));
    },
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipe & Permissões</h1>
          <p className="text-sm text-muted-foreground">Promova usuários a agentes ou administradores</p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <AddAgentDialog />
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border border-border bg-surface">
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
              const currentRole = u.role ?? "client";
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

function AddAgentDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  const promote = useMutation({
    mutationFn: async () => {
      const normalized = email.trim().toLowerCase();
      if (!normalized) throw new Error("Informe o email");
      const { data: profile, error: lookupError } = await supabase.from("profiles").select("id,email").ilike("email", normalized).maybeSingle();
      if (lookupError) throw lookupError;
      if (!profile) throw new Error("Usuário com esse email não encontrado. Peça para criar a conta primeiro.");
      const { error } = await supabase.rpc("admin_set_role", { _user_id: profile.id, _role: "agent" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conta promovida a agente");
      setEmail("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["team-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" /> Adicionar agente
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adicionar agente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Digite o email de uma conta já cadastrada para promovê-la a agente.</p>
            <Input type="email" placeholder="agente@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && promote.mutate()} />
            <Button className="w-full" onClick={() => promote.mutate()} disabled={promote.isPending}>
              {promote.isPending ? "Promovendo..." : "Promover a agente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
