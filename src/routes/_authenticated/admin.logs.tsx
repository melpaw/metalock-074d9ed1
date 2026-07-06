import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  component: LogsPage,
});

function LogsPage() {
  const { t, i18n } = useTranslation();
  const { data } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("logs.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("logs.subtitle")}</p>
      </div>
      <div className="overflow-hidden rounded-sm border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t("logs.when")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("logs.action")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("logs.target")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("tx.details")}</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((l) => (
                <tr key={l.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums">{new Date(l.created_at).toLocaleString(i18n.language)}</td>
                  <td className="px-4 py-3"><span className="rounded-sm bg-accent px-2 py-0.5 text-xs font-mono text-accent-foreground">{l.action}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{l.target_type} {l.target_id?.slice(0, 8)}</td>
                  <td className="px-4 py-3"><pre className="text-xs text-muted-foreground max-w-md truncate">{JSON.stringify(l.metadata)}</pre></td>
                </tr>
              ))}
              {(!data || data.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">{t("logs.empty")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
