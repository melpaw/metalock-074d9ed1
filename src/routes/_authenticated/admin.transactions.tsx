import { createFileRoute } from "@tanstack/react-router";
import { TransactionsQueue } from "@/components/queues/TransactionsQueue";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/admin/transactions")({
  component: AdminTransactions,
});

function AdminTransactions() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.transactions")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.transactionsQueueSubtitle")}</p>
      </div>
      <TransactionsQueue />
    </div>
  );
}
