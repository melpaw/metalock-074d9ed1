import { createFileRoute } from "@tanstack/react-router";
import { KycQueue } from "@/components/queues/KycQueue";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/admin/kyc")({
  component: AdminKyc,
});

function AdminKyc() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("admin.pendingKyc")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.kycQueueSubtitle")}</p>
      </div>
      <KycQueue detailRoute="/admin/clients/$userId" />
    </div>
  );
}
