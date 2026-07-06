import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRouter,
});

function DashboardRouter() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["my-role"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role");
      return data ?? [];
    },
  });

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">{t("common.loading")}</div>;
  }

  const roles = (data ?? []).map((r) => r.role);
  if (roles.includes("admin")) return <Navigate to="/admin" />;
  if (roles.includes("agent")) return <Navigate to="/admin" />;
  return <Navigate to="/app" />;

}
