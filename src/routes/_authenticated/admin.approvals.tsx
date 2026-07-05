import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/approvals")({
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const qc = useQueryClient();

  const { data: pending } = useQuery({
    queryKey: ["pending-tx"],
    queryFn: async () => (await supabase
      .from("transactions")
      .select("*, currencies(symbol), profiles!transactions_user_id_fkey(email,full_name)")
      .eq("status", "pending")
      .in("type", ["deposit","withdrawal"])
      .order("created_at",{ascending:true})).data ?? [],
    refetchInterval: 15000,
  });

  const process = useMutation({
    mutationFn: async ({ id, type, approve }: { id: string; type: string; approve: boolean }) => {
      const rpc = type === "deposit" ? "admin_process_deposit" : "admin_process_withdrawal";
      const { error } = await supabase.rpc(rpc, { _tx_id: id, _approve: approve });
      if (error) throw error;
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ["pending-tx"] }); toast.success(v.approve ? "Aprovado" : "Rejeitado"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Aprovações pendentes</h1>
        <p className="text-sm text-muted-foreground">Depósitos e saques aguardando revisão</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Usuário</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-left">Detalhes</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pending?.map((t: any) => (
              <tr key={t.id} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-3 capitalize">{t.type}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{t.profiles?.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{t.profiles?.email}</div>
                </td>
                <td className="px-4 py-3 text-right font-mono">{Number(t.amount).toFixed(8)} {t.currencies?.symbol}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono max-w-xs truncate">
                  {t.metadata?.tx_hash || t.metadata?.address || "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => process.mutate({ id: t.id, type: t.type, approve: true })}>
                      <Check className="h-4 w-4 text-up" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => process.mutate({ id: t.id, type: t.type, approve: false })}>
                      <X className="h-4 w-4 text-down" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {pending?.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Nenhuma pendência.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
