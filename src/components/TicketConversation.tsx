import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { Send, Lock, Save } from "lucide-react";

type Props = { ticketId: string; canManage: boolean };

export function TicketConversation({ ticketId, canManage }: Props) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [me, setMe] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setMe(uid);
      if (uid) {
        const { data: p } = await supabase.from("profiles").select("agent_display_name").eq("id", uid).maybeSingle();
        setDisplayName((p as any)?.agent_display_name ?? "");
      }
    });
  }, []);

  const { data: ticket } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_tickets")
        .select("*, profiles!support_tickets_user_id_fkey(email,full_name)")
        .eq("id", ticketId)
        .maybeSingle();
      return data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: async () => {
      const { data: msgs } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      const ids = Array.from(new Set((msgs ?? []).map((m: any) => m.sender_id)));
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id,full_name,agent_display_name,email").in("id", ids) : { data: [] };
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (msgs ?? []).map((m: any) => ({ ...m, sender: map.get(m.sender_id) }));
    },
    refetchInterval: 8000,
  });

  // Realtime: subscribe to ticket_messages for this ticket
  useEffect(() => {
    const ch = supabase
      .channel(`ticket:${ticketId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${ticketId}` },
        () => qc.invalidateQueries({ queryKey: ["ticket-messages", ticketId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ticketId, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useMutation({
    mutationFn: async () => {
      if (!body.trim() || !me) return;
      const { error } = await supabase.from("ticket_messages").insert({
        ticket_id: ticketId, sender_id: me, body: body.trim(), is_internal: canManage && internal,
      });
      if (error) throw error;
      if (canManage) {
        await supabase.from("support_tickets").update({ status: "pending" }).eq("id", ticketId);
      }
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["ticket-messages", ticketId] });
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateTicket = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("support_tickets").update(patch).eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["tickets-queue"] });
      toast.success("Ticket atualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  async function saveDisplayName() {
    setSavingName(true);
    const { error } = await supabase.rpc("set_agent_display_name" as any, { _display_name: displayName || null });
    setSavingName(false);
    if (error) return toast.error(error.message);
    toast.success("Nome de exibição salvo");
  }

  if (!ticket) return <div className="text-muted-foreground">Carregando...</div>;

  function nameFor(m: any, mine: boolean) {
    if (mine) return "Você";
    const s = m.sender;
    if (!s) return "Cliente";
    return s.agent_display_name || s.full_name || "Suporte";
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="rounded-xl border border-border bg-surface flex flex-col h-[70vh]">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold flex-1">{ticket.subject}</h2>
            <Badge variant="outline" className="capitalize">{ticket.priority}</Badge>
            <Badge variant="outline" className="capitalize">{ticket.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {(ticket as any).profiles?.full_name || (ticket as any).profiles?.email} · {ticket.category}
          </p>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages?.map((m: any) => {
            const mine = m.sender_id === me;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  m.is_internal ? "bg-warning/20 border border-warning/40" :
                  mine ? "bg-primary text-primary-foreground" : "bg-surface-elevated"
                }`}>
                  {m.is_internal && <div className="flex items-center gap-1 text-[10px] uppercase mb-1"><Lock className="h-3 w-3" /> Nota interna</div>}
                  <div className="text-[10px] font-medium opacity-80 mb-0.5">{nameFor(m, mine)}</div>
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div className="text-[10px] opacity-70 mt-1">{new Date(m.created_at).toLocaleString("pt-BR")}</div>
                </div>
              </div>
            );
          })}
          {messages?.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">Sem mensagens ainda.</div>}
        </div>
        <div className="border-t border-border p-3 space-y-2">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva sua mensagem..." rows={2} />
          <div className="flex items-center justify-between">
            {canManage ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                Nota interna (visível só para equipe)
              </label>
            ) : <div />}
            <Button onClick={() => send.mutate()} disabled={!body.trim() || send.isPending}>
              <Send className="h-4 w-4 mr-2" /> Enviar
            </Button>
          </div>
        </div>
      </div>

      {canManage && (
        <div className="rounded-xl border border-border bg-surface p-4 space-y-4 h-fit">
          <h3 className="text-sm font-semibold">Controle</h3>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Nome exibido ao cliente</label>
            <div className="flex gap-2">
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="ex: João Suporte" />
              <Button size="icon" variant="outline" onClick={saveDisplayName} disabled={savingName}><Save className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={ticket.status} onValueChange={(v) => updateTicket.mutate({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="pending">Aguardando cliente</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="closed">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Prioridade</label>
            <Select value={ticket.priority} onValueChange={(v) => updateTicket.mutate({ priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="w-full" onClick={() => updateTicket.mutate({ agent_id: me })}>
            Assumir ticket
          </Button>
        </div>
      )}
    </div>
  );
}
