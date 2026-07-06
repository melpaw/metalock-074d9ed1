import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { TicketsQueue } from "@/components/queues/TicketsQueue";

export const Route = createFileRoute("/_authenticated/agent/tickets")({
  component: AgentTickets,
});

function AgentTickets() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isDetail = pathname !== "/agent/tickets";
  if (isDetail) return <Outlet />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
        <p className="text-sm text-muted-foreground">Chats abertos aguardando resposta.</p>
      </div>
      <TicketsQueue detailRoute="/agent/tickets/$ticketId" />
    </div>
  );
}
