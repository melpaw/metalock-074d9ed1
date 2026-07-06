import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/admin/tickets")({
  component: TicketsPage,
});

function TicketsPage() {
  const { t, i18n } = useTranslation();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isDetail = pathname !== "/admin/tickets";

  const { data: tickets, isLoading, error } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((tk: any) => tk.user_id)));
      const { data: profiles } = ids.length ? await supabase.from("profiles").select("id,email,full_name").in("id", ids) : { data: [] };
      const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      return (data ?? []).map((tk: any) => ({ ...tk, profiles: byId.get(tk.user_id) }));
    },
    refetchInterval: 15000,
  });

  if (isDetail) return <Outlet />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("support.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("support.adminSubtitle")}</p>
      </div>
      <div className="rounded-xl border border-border bg-surface divide-y divide-border">
        {isLoading && <div className="p-12 text-center text-muted-foreground">{t("common.loading")}</div>}
        {error && <div className="p-6 text-sm text-down">{(error as Error).message}</div>}
        {tickets?.map((ticket: any) => (
          <Link key={ticket.id} to="/admin/tickets/$ticketId" params={{ ticketId: ticket.id }}
            className="flex items-center gap-3 p-4 hover:bg-surface-elevated transition">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{ticket.subject}</div>
              <div className="text-xs text-muted-foreground">
                {ticket.profiles?.full_name || ticket.profiles?.email} · {t(`support.categories.${ticket.category}`, { defaultValue: ticket.category })} · {new Date(ticket.created_at).toLocaleString(i18n.language)}
              </div>
            </div>
            <Badge variant="outline">{t(`support.priorities.${ticket.priority}`, { defaultValue: ticket.priority })}</Badge>
            <Badge variant="outline">{t(`support.statuses.${ticket.status}`, { defaultValue: ticket.status })}</Badge>
          </Link>
        ))}
        {tickets?.length === 0 && !isLoading && !error && <div className="p-12 text-center text-muted-foreground">{t("support.emptyAdmin")}</div>}
      </div>
    </div>
  );
}
