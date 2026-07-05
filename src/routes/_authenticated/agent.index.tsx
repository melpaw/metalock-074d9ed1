import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/agent/")({
  component: QueuePage,
});

function QueuePage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("open");

  const { data: tickets } = useQuery({
    queryKey: ["tickets-queue", filter],
    queryFn: async () => {
      let q = supabase.from("support_tickets").select("*, profiles!support_tickets_user_id_fkey(email,full_name)").order("created_at",{ascending:false});
      if (filter !== "all") q = q.eq("status", filter);
      return (await q).data ?? [];
    },
    refetchInterval: 15000,
  });

  const filtered = tickets?.filter((t: any) =>
    !search || t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.profiles?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fila de tickets</h1>
        <p className="text-sm text-muted-foreground">Atenda os clientes em ordem de prioridade</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {["open","pending","resolved","closed","all"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-md text-xs capitalize border ${filter===s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {s === "all" ? "todos" : s}
          </button>
        ))}
        <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm ml-auto" />
      </div>

      <div className="rounded-xl border border-border bg-surface divide-y divide-border">
        {filtered?.map((t: any) => (
          <Link key={t.id} to="/agent/tickets/$ticketId" params={{ ticketId: t.id }}
            className="flex items-center gap-3 p-4 hover:bg-surface-elevated transition">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{t.subject}</div>
              <div className="text-xs text-muted-foreground">
                {t.profiles?.full_name || t.profiles?.email} · {t.category} · {new Date(t.created_at).toLocaleString("pt-BR")}
              </div>
            </div>
            <Badge variant="outline" className={
              t.priority === "urgent" ? "border-down/40 text-down" :
              t.priority === "high" ? "border-warning/40 text-warning" : ""
            }>{t.priority}</Badge>
            <Badge variant="outline" className="capitalize">{t.status}</Badge>
          </Link>
        ))}
        {filtered?.length === 0 && <div className="p-12 text-center text-muted-foreground">Nenhum ticket.</div>}
      </div>
    </div>
  );
}
