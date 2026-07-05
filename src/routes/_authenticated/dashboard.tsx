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

  const isAdmin = data?.some((r) => r.role === "admin");
  if (isAdmin) return <Navigate to="/admin" />;
  // TODO: client dashboard (Fase 2)
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Área do cliente em construção</h1>
        <p className="mt-2 text-muted-foreground">Sua wallet, investimentos e staking chegam na Fase 2.</p>
      </div>
    </div>
  );
}
