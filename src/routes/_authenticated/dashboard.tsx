import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRouter,
});

function DashboardRouter() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-role"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role");
      return data ?? [];
    },
  });

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Carregando...</div>;
  }

  const roles = (data ?? []).map((r) => r.role);
  if (roles.includes("admin")) return <Navigate to="/admin" />;
  if (roles.includes("agent")) return <Navigate to="/agent" />;
  return <Navigate to="/app" />;
}
