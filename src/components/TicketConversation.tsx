import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { Send, Lock, Save, Circle } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = { ticketId: string; canManage: boolean };

export function TicketConversation({ ticketId, canManage }: Props) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [me, setMe] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [connected, setConnected] = useState(false);

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

  const { data: ticket, isLoading: ticketLoading, error: ticketError } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", ticketId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      if (!canManage) return data;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email,full_name")
        .eq("id", (data as any).user_id)
        .maybeSingle();

      return { ...data, profiles: profile };
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: async () => {
      const { data: msgs, error } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const ids = Array.from(new Set((msgs ?? []).map((m: any) => m.sender_id)));
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id,full_name,agent_display_name,email").in("id", ids) : { data: [] };
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (msgs ?? []).map((m: any) => ({ ...m, sender: map.get(m.sender_id) }));
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    const ch = supabase
      .channel(`ticket:${ticketId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${ticketId}` },
        () => qc.invalidateQueries({ queryKey: ["ticket-messages", ticketId] }))
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));
    return () => { supabase.removeChannel(ch); setConnected(false); };
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
        const { error: statusError } = await supabase.from("support_tickets").update({ status: "pending" }).eq("id", ticketId);
        if (statusError) throw statusError;
      } else {
        const { error: statusError } = await supabase.from("support_tickets").update({ status: "open" }).eq("id", ticketId);
        if (statusError) throw statusError;
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
      toast.success(t("support.ticketUpdated"));
    },
    onError: (e) => toast.error(e.message),
  });

  async function saveDisplayName() {
    setSavingName(true);
    const { error } = await supabase.rpc("set_agent_display_name" as any, { _display_name: displayName || null });
    setSavingName(false);
    if (error) return toast.error(error.message);
    toast.success(t("support.displayNameSaved"));
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (body.trim() && !send.isPending) send.mutate();
    }
  }

  if (ticketLoading) return <div className="text-muted-foreground">{t("common.loading")}</div>;
  if (ticketError) return <div className="rounded-sm border border-down/30 bg-down/10 p-4 text-sm text-down">{(ticketError as Error).message}</div>;
  if (!ticket) return <div className="rounded-sm border border-border bg-surface p-4 text-sm text-muted-foreground">{t("support.ticketUnavailable")}</div>;

  function nameFor(m: any, mine: boolean) {
    if (mine) return t("support.you");
    const s = m.sender;
    if (!s) return t("support.client");
    return s.agent_display_name || s.full_name || t("support.supportTeam");
  }

  function initialsFor(m: any) {
    const s = m.sender;
    const name = s?.agent_display_name || s?.full_name || s?.email || "?";
    return name.slice(0, 2).toUpperCase();
  }

  const statusLabel = t(`support.statuses.${(ticket as any).status}`, { defaultValue: (ticket as any).status });
  const priorityLabel = t(`support.priorities.${(ticket as any).priority}`, { defaultValue: (ticket as any).priority });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="rounded-sm border border-border bg-surface flex flex-col h-[70vh] overflow-hidden">
        <div className="border-b border-border p-4 bg-surface-elevated/40">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold flex-1 min-w-0 truncate">{ticket.subject}</h2>
            <Badge variant="outline">{priorityLabel}</Badge>
            <Badge variant="outline">{statusLabel}</Badge>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Circle className={`h-2 w-2 ${connected ? "text-up fill-up" : "text-muted-foreground fill-muted"}`} />
              {connected ? t("support.connected") : t("support.connecting")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {canManage && ((ticket as any).profiles?.full_name || (ticket as any).profiles?.email) ? `${(ticket as any).profiles?.full_name || (ticket as any).profiles?.email} · ` : ""}{t(`support.categories.${ticket.category}`, { defaultValue: ticket.category })}
          </p>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages?.map((m: any) => {
            const mine = m.sender_id === me;
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && (
                  <div className="grid h-8 w-8 place-items-center rounded-sm bg-primary/20 text-[10px] font-bold text-primary shrink-0">
                    {initialsFor(m)}
                  </div>
                )}
                <div className={`max-w-[75%] rounded-sm px-3.5 py-2 text-sm shadow-sm ${
                  m.is_internal ? "bg-warning/15 border border-warning/40" :
                  mine ? "bg-primary text-primary-foreground" : "bg-surface-elevated"
                }`}>
                  {m.is_internal && <div className="flex items-center gap-1 text-[10px] uppercase mb-1 opacity-80"><Lock className="h-3 w-3" /> {t("support.internalNote")}</div>}
                  <div className="text-[10px] font-semibold opacity-80 mb-0.5">{nameFor(m, mine)}</div>
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div className="text-[10px] opacity-70 mt-1 text-right">{new Date(m.created_at).toLocaleString(i18n.language)}</div>
                </div>
                {mine && (
                  <div className="grid h-8 w-8 place-items-center rounded-sm gradient-primary text-[10px] font-bold text-primary-foreground shrink-0">
                    {t("support.you").slice(0, 2)}
                  </div>
                )}
              </div>
            );
          })}
          {messages?.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">{t("support.noMessages")}</div>}
        </div>
        <div className="border-t border-border p-3 space-y-2 bg-surface-elevated/30">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={onKey} placeholder={t("support.typeMessage")} rows={2} className="resize-none" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              {canManage ? (
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                  {t("support.internalNote")}
                </label>
              ) : (
                <span className="text-[10px] text-muted-foreground">{t("support.pressEnterHint")}</span>
              )}
            </div>
            <Button onClick={() => send.mutate()} disabled={!body.trim() || send.isPending} size="sm">
              <Send className="h-4 w-4 mr-2" /> {send.isPending ? t("common.sending") : t("common.send")}
            </Button>
          </div>
        </div>
      </div>

      {canManage && (
        <div className="rounded-sm border border-border bg-surface p-4 space-y-4 h-fit">
          <h3 className="text-sm font-semibold">{t("support.controlPanel")}</h3>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{t("support.displayName")}</label>
            <div className="flex gap-2">
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("support.displayNamePlaceholder")} />
              <Button size="icon" variant="outline" onClick={saveDisplayName} disabled={savingName}><Save className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{t("common.status")}</label>
            <Select value={ticket.status} onValueChange={(v) => updateTicket.mutate({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">{t("support.statuses.open")}</SelectItem>
                <SelectItem value="pending">{t("support.statuses.pending")}</SelectItem>
                <SelectItem value="resolved">{t("support.statuses.resolved")}</SelectItem>
                <SelectItem value="closed">{t("support.statuses.closed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{t("support.priority")}</label>
            <Select value={ticket.priority} onValueChange={(v) => updateTicket.mutate({ priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t("support.priorities.low")}</SelectItem>
                <SelectItem value="normal">{t("support.priorities.normal")}</SelectItem>
                <SelectItem value="high">{t("support.priorities.high")}</SelectItem>
                <SelectItem value="urgent">{t("support.priorities.urgent")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="w-full" onClick={() => updateTicket.mutate({ agent_id: me })}>
            {t("support.assumeTicket")}
          </Button>
        </div>
      )}
    </div>
  );
}
