import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Shield } from "lucide-react";
import { toast } from "sonner";

export function AgentPermissionsDialog({ agentId }: { agentId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [canAddWallets, setCanAddWallets] = useState(false);

  const { data } = useQuery({
    queryKey: ["agent-perms", agentId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("agent_permissions").select("*").eq("agent_id", agentId).maybeSingle();
      return data ?? { agent_id: agentId, can_add_wallets: false };
    },
  });

  useEffect(() => {
    if (data) setCanAddWallets(!!(data as any).can_add_wallets);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("agent_permissions").upsert({
        agent_id: agentId,
        can_add_wallets: canAddWallets,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Permissões atualizadas");
      qc.invalidateQueries({ queryKey: ["agent-perms", agentId] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Shield className="mr-1 h-3.5 w-3.5" /> Permissões
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permissões do agente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-sm border border-border bg-surface-elevated p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">Adicionar carteiras nos clientes</div>
                <div className="text-xs text-muted-foreground">
                  Se ativado, este agente pode adicionar novas moedas na carteira de seus clientes.
                </div>
              </div>
              <Switch checked={canAddWallets} onCheckedChange={setCanAddWallets} />
            </div>
            <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Salvando..." : "Salvar permissões"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
