import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

type Route = "/admin/tickets/$ticketId" | "/agent/tickets/$ticketId";

export function TicketsQueue({ detailRoute }: { detailRoute: Route }) {
  const { t, i18n } = useTranslation();
  const { data: tickets } = useQuery({
    queryKey: ["staff-tickets", detailRoute],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .in("status", ["open", "pending"])
        .order("created_at", { ascending: false });
      const ids = Array.from(new Set((data ?? []).map((t: any) => t.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,email,full_name").in("id", ids)
        : { data: [] };
      const pm = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (data ?? []).map((t: any) => ({ ...t, profile: pm.get(t.user_id) }));
    },
    refetchInterval: 15000,
  });

  return (
    <div className="rounded-sm border border-border bg-surface divide-y divide-border">
      {!tickets || tickets.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">{t("admin.noPendingChats")}</div>
      ) : (
        tickets.map((ticket: any) => (
          <Link
            key={ticket.id}
            to={detailRoute}
            params={{ ticketId: ticket.id }}
            className="flex items-center gap-3 px-5 py-4 transition hover:bg-surface-elevated"
          >
            <div className="grid h-10 w-10 place-items-center rounded-sm gradient-primary text-xs font-bold text-primary-foreground">
              {(ticket.profile?.full_name || ticket.profile?.email || "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{ticket.subject}</div>
              <div className="truncate text-xs text-muted-foreground">
                {ticket.profile?.full_name || ticket.profile?.email} · {t(`support.categories.${ticket.category}`, { defaultValue: ticket.category })} · {new Date(ticket.created_at).toLocaleString(i18n.language)}
              </div>
            </div>
            <Badge variant="outline" className={
              ticket.priority === "urgent" ? "border-down/40 text-down" :
              ticket.priority === "high" ? "border-warning/40 text-warning" : ""
            }>{t(`support.priorities.${ticket.priority}`, { defaultValue: ticket.priority })}</Badge>
            <Badge variant="outline">{t(`support.statuses.${ticket.status}`, { defaultValue: ticket.status })}</Badge>
          </Link>
        ))
      )}
    </div>
  );
}
