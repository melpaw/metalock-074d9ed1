import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/tickets")({
  component: TicketsPage,
});

function TicketsPage() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isDetail = pathname !== "/admin/tickets";

  const { data: tickets } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => (await supabase.from("support_tickets").select("*, profiles!support_tickets_user_id_fkey(email,full_name)").order("created_at",{ascending:false})).data ?? [],
    refetchInterval: 15000,
  });

  if (isDetail) return <Outlet />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tickets de suporte</h1>
        <p className="text-sm text-muted-foreground">Visão administrativa completa</p>
      </div>
      <div className="rounded-xl border border-border bg-surface divide-y divide-border">
        {tickets?.map((t: any) => (
          <Link key={t.id} to="/admin/tickets/$ticketId" params={{ ticketId: t.id }}
            className="flex items-center gap-3 p-4 hover:bg-surface-elevated transition">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{t.subject}</div>
              <div className="text-xs text-muted-foreground">
                {t.profiles?.full_name || t.profiles?.email} · {t.category} · {new Date(t.created_at).toLocaleString("pt-BR")}
              </div>
            </div>
            <Badge variant="outline" className="capitalize">{t.priority}</Badge>
            <Badge variant="outline" className="capitalize">{t.status}</Badge>
          </Link>
        ))}
        {tickets?.length === 0 && <div className="p-12 text-center text-muted-foreground">Nenhum ticket.</div>}
      </div>
    </div>
  );
}
