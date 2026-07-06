import { createFileRoute } from "@tanstack/react-router";
import { KycQueue } from "@/components/queues/KycQueue";

export const Route = createFileRoute("/_authenticated/admin/kyc")({
  component: AdminKyc,
});

function AdminKyc() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">KYC pendentes</h1>
        <p className="text-sm text-muted-foreground">Verifique documentos e aprove ou rejeite as solicitações.</p>
      </div>
      <KycQueue detailRoute="/admin/clients/$userId" />
    </div>
  );
}
