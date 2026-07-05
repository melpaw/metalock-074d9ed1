import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/transactions")({
  component: TxPage,
});

function TxPage() {
  const { data: txs } = useQuery({
    queryKey: ["my-transactions"],
    queryFn: async () => (await supabase.from("transactions").select("*, currencies(symbol)").order("created_at",{ascending:false}).limit(200)).data ?? [],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Extrato</h1>
        <p className="text-sm text-muted-foreground">Suas últimas transações</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-right">Data</th>
            </tr>
          </thead>
          <tbody>
            {txs?.map((t: any) => (
              <tr key={t.id} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-3 capitalize">{t.type}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={
                    t.status === "completed" ? "border-up/30 text-up" :
                    t.status === "pending" ? "border-warning/30 text-warning" :
                    "border-down/30 text-down"
                  }>{t.status}</Badge>
                </td>
                <td className={`px-4 py-3 text-right font-mono ${Number(t.amount) >= 0 ? "text-up" : "text-down"}`}>
                  {Number(t.amount) >= 0 ? "+" : ""}{Number(t.amount).toFixed(8)} {t.currencies?.symbol}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
            {txs?.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Sem transações ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
