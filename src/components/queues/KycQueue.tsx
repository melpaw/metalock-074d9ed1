import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

/**
 * Fila de KYC pendente — lista todos os clientes com kyc_status="pending".
 * Cada linha leva para o perfil do cliente onde admin/agente pode aprovar/rejeitar.
 * A rota destino difere entre admin e agente (mesma tela de detalhes está em /admin/clients/$userId).
 */
export function KycQueue({ detailRoute = "/admin/clients/$userId" as const }: { detailRoute?: "/admin/clients/$userId" }) {
  const { data: rows, isLoading } = useQuery({
    queryKey: ["kyc-pending"],
    queryFn: async () => {
      const { data } = await supabase
        .from("kyc_submissions")
        .select("id,user_id,status,created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      const ids = Array.from(new Set((data ?? []).map((r: any) => r.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,email,full_name,kyc_status").in("id", ids)
        : { data: [] };
      const pm = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (data ?? []).map((r: any) => ({ ...r, profile: pm.get(r.user_id) }));
    },
    refetchInterval: 20000,
  });

  return (
    <div className="rounded-sm border border-border bg-surface">
      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
      ) : !rows || rows.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">Nenhum KYC pendente.</div>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((r: any) => (
            <div key={r.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-5 py-4">
              <div className="grid h-10 w-10 place-items-center rounded-sm gradient-primary text-xs font-bold text-primary-foreground">
                {(r.profile?.full_name || r.profile?.email || "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold text-sm">{r.profile?.full_name || r.profile?.email?.split("@")[0]}</div>
                <div className="truncate text-xs text-muted-foreground">{r.profile?.email}</div>
              </div>
              <span className="rounded-sm border border-warning/30 bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
                KYC pendente
              </span>
              <Button asChild size="sm" variant="outline">
                <Link to={detailRoute} params={{ userId: r.user_id }}>
                  Verificar <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
