import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Circle, Ticket as TicketIcon, Clock } from "lucide-react";
import { AddClientDialog } from "@/components/AddClientDialog";

export const Route = createFileRoute("/_authenticated/admin/clients/")({
  component: ClientsList,
});

function ClientsList() {
  const [search, setSearch] = useState("");

  const { data: clients, isLoading } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "client");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const [profiles, tx, tickets] = await Promise.all([
        supabase.from("profiles").select("*").in("id", ids),
        supabase.from("transactions").select("user_id, status").in("user_id", ids).eq("status", "pending"),
        supabase.from("support_tickets").select("user_id, status").in("user_id", ids).in("status", ["open", "pending"]),
      ]);
      return (profiles.data ?? []).map((p: any) => ({
        ...p,
        pendingTx: (tx.data ?? []).filter((t) => t.user_id === p.id).length,
        openTickets: (tickets.data ?? []).filter((t) => t.user_id === p.id).length,
      }));
    },
  });

  const filtered = clients?.filter((c: any) =>
    !search ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.full_name?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {clients?.length ?? 0} clientes cadastrados. Clique em um card para gerenciar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Buscar por email ou nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <AddClientDialog />
        </div>
      </div>

      {isLoading && <div className="text-center text-muted-foreground py-12">Carregando...</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="rounded-sm border border-border bg-surface p-12 text-center text-muted-foreground">
          Nenhum cliente encontrado.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((c: any) => (
          <Link
            key={c.id}
            to="/admin/clients/$userId"
            params={{ userId: c.id }}
            className="group block rounded-sm border border-border bg-surface p-4 transition hover:border-primary hover:bg-surface-elevated"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-sm gradient-primary font-bold text-primary-foreground">
                {(c.full_name || c.email || "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate font-semibold">{c.full_name || c.email?.split("@")[0]}</div>
                  <StatusDot status={c.status} />
                </div>
                <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Cadastro {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Metric icon={Clock} label="Tx pendentes" value={c.pendingTx} highlight={c.pendingTx > 0 ? "warning" : undefined} />
              <Metric icon={TicketIcon} label="Tickets" value={c.openTickets} highlight={c.openTickets > 0 ? "down" : undefined} />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <KycBadge status={c.kyc_status} />
              <span className="text-primary opacity-0 transition group-hover:opacity-100">Gerenciar →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "active" ? "text-up fill-up" : status === "frozen" ? "text-warning fill-warning" : "text-down fill-down";
  return <Circle className={`h-2 w-2 ${color}`} />;
}

function Metric({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: number; highlight?: "warning" | "down" }) {
  const color = highlight === "warning" ? "text-warning" : highlight === "down" ? "text-down" : "text-muted-foreground";
  return (
    <div className="flex items-center gap-2 rounded-md bg-surface-elevated px-2 py-2">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <div className="min-w-0">
        <div className="truncate text-[10px] uppercase text-muted-foreground">{label}</div>
        <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
      </div>
    </div>
  );
}

function KycBadge({ status }: { status: string | null }) {
  const s = status ?? "not_started";
  const map: Record<string, string> = {
    approved: "bg-up/15 text-up border-up/30",
    pending: "bg-warning/15 text-warning border-warning/30",
    rejected: "bg-down/15 text-down border-down/30",
    not_started: "bg-muted/30 text-muted-foreground border-border",
  };
  const label: Record<string, string> = {
    approved: "KYC verificado",
    pending: "KYC pendente",
    rejected: "KYC recusado",
    not_started: "Sem KYC",
  };
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium ${map[s]}`}>{label[s]}</span>;
}
