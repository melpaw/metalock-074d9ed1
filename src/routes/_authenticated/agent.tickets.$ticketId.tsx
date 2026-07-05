import { createFileRoute, Link } from "@tanstack/react-router";
import { TicketConversation } from "@/components/TicketConversation";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agent/tickets/$ticketId")({
  component: TicketPage,
});

function TicketPage() {
  const { ticketId } = Route.useParams();
  return (
    <div className="space-y-4">
      <Link to="/agent" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Voltar à fila
      </Link>
      <TicketConversation ticketId={ticketId} canManage={true} />
    </div>
  );
}
