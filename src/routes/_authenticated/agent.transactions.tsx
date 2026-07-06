import { createFileRoute } from "@tanstack/react-router";
import { TransactionsQueue } from "@/components/queues/TransactionsQueue";

export const Route = createFileRoute("/_authenticated/agent/transactions")({
  component: AgentTransactions,
});

function AgentTransactions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transações</h1>
        <p className="text-sm text-muted-foreground">Pendências dos seus clientes.</p>
      </div>
      <TransactionsQueue />
    </div>
  );
}
