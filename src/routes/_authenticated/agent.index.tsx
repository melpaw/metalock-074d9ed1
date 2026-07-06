import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Coins, ChevronRight, Shield, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agent/")({
  component: AgentDashboard,
});

function AgentDashboard() {
  const { data: counts } = useQuery({
    queryKey: ["agent-counts"],
    queryFn: async () => {
      // Only own clients (RLS filters automatically for agents)
      const [txs, kyc, tickets] = await Promise.all([
        supabase.from("transactions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("kyc_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "pending"]),
      ]);
      return { txs: txs.count ?? 0, kyc: kyc.count ?? 0, tickets: tickets.count ?? 0 };
    },
    refetchInterval: 20000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel do agente</h1>
        <p className="text-sm text-muted-foreground">Acompanhe as pendências dos seus clientes.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <QueueCard to="/agent/transactions" title="Transações pendentes" value={counts?.txs ?? 0} icon={Coins} tone="warning" />
        <QueueCard to="/agent/kyc" title="KYC pendentes" value={counts?.kyc ?? 0} icon={Shield} tone="primary" />
        <QueueCard to="/agent/tickets" title="Chats pendentes" value={counts?.tickets ?? 0} icon={MessageSquare} tone="down" />
      </div>
    </div>
  );
}

function QueueCard({ to, title, value, icon: Icon, tone }: { to: any; title: string; value: number; icon: any; tone: "warning" | "primary" | "down" }) {
  const toneMap = {
    warning: "border-warning/30 text-warning bg-warning/10",
    primary: "border-primary/30 text-primary bg-primary/10",
    down: "border-down/30 text-down bg-down/10",
  };
  return (
    <Link to={to} className="group rounded-sm border border-border bg-surface p-4 transition hover:border-primary hover:bg-surface-elevated">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</div>
          <div className="mt-1 text-3xl font-black tabular-nums">{value}</div>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-sm border ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-70 group-hover:opacity-100">
        Abrir fila <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}
