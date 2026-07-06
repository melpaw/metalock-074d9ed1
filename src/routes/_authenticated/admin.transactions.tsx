import { createFileRoute } from "@tanstack/react-router";
import { TransactionsQueue } from "@/components/queues/TransactionsQueue";

export const Route = createFileRoute("/_authenticated/admin/transactions")({
  component: AdminTransactions,
});

function AdminTransactions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transações</h1>
        <p className="text-sm text-muted-foreground">Depósitos, saques e compras dos clientes. Aprove ou rejeite as pendências.</p>
      </div>
      <TransactionsQueue />
    </div>
  );
}
