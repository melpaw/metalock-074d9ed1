import { createFileRoute } from "@tanstack/react-router";
import { KycQueue } from "@/components/queues/KycQueue";

export const Route = createFileRoute("/_authenticated/agent/kyc")({
  component: AgentKyc,
});

function AgentKyc() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">KYC pendentes</h1>
        <p className="text-sm text-muted-foreground">Documentos aguardando verificação.</p>
      </div>
      <KycQueue detailRoute="/admin/clients/$userId" />
    </div>
  );
}
