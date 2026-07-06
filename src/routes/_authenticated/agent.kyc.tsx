import { createFileRoute } from "@tanstack/react-router";
import { KycQueue } from "@/components/queues/KycQueue";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/agent/kyc")({
  component: AgentKyc,
});

function AgentKyc() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("admin.pendingKyc")}</h1>
        <p className="text-sm text-muted-foreground">{t("agent.kycSubtitle")}</p>
      </div>
      <KycQueue detailRoute="/admin/clients/$userId" />
    </div>
  );
}
