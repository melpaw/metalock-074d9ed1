import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

type Route = "/admin/tickets/$ticketId" | "/agent/tickets/$ticketId";

export function TicketsQueue({ detailRoute }: { detailRoute: Route }) {
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
        <div className="p-12 text-center text-sm text-muted-foreground">Nenhum chat pendente.</div>
      ) : (
        tickets.map((t: any) => (
          <Link
            key={t.id}
            to={detailRoute}
            params={{ ticketId: t.id }}
            className="flex items-center gap-3 px-5 py-4 transition hover:bg-surface-elevated"
          >
            <div className="grid h-10 w-10 place-items-center rounded-sm gradient-primary text-xs font-bold text-primary-foreground">
              {(t.profile?.full_name || t.profile?.email || "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{t.subject}</div>
              <div className="truncate text-xs text-muted-foreground">
                {t.profile?.full_name || t.profile?.email} · {t.category} · {new Date(t.created_at).toLocaleString()}
              </div>
            </div>
            <Badge variant="outline" className={
              t.priority === "urgent" ? "border-down/40 text-down" :
              t.priority === "high" ? "border-warning/40 text-warning" : ""
            }>{t.priority}</Badge>
            <Badge variant="outline" className="capitalize">{t.status}</Badge>
          </Link>
        ))
      )}
    </div>
  );
}
