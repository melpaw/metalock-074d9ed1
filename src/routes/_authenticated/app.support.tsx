import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/app/support")({
  component: SupportPage,
});

function SupportPage() {
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isDetail = pathname !== "/app/support";

  const { data: tickets } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: async () => (await supabase.from("support_tickets").select("*").order("created_at",{ascending:false})).data ?? [],
  });

  if (isDetail) return <Outlet />;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suporte</h1>
          <p className="text-sm text-muted-foreground">Fale com nossa equipe</p>
        </div>
        <NewTicket onDone={() => qc.invalidateQueries({ queryKey: ["my-tickets"] })} />
      </div>

      <div className="rounded-xl border border-border bg-surface divide-y divide-border">
        {tickets?.map((t: any) => (
          <Link key={t.id} to="/app/support/$ticketId" params={{ ticketId: t.id }}
            className="flex items-center gap-3 p-4 hover:bg-surface-elevated transition">
            <MessageCircle className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{t.subject}</div>
              <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")} · {t.category}</div>
            </div>
            <Badge variant="outline" className="capitalize">{t.priority}</Badge>
            <Badge variant="outline" className="capitalize">{t.status}</Badge>
          </Link>
        ))}
        {tickets?.length === 0 && <div className="p-12 text-center text-muted-foreground">Nenhum ticket. Abra um novo para começar.</div>}
      </div>
    </div>
  );
}

function NewTicket({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!subject || !body) return toast.error("Preencha assunto e mensagem");
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Não autenticado");
      const { data: ticket, error } = await supabase.from("support_tickets").insert({
        user_id: user.user.id, subject, category, priority,
      }).select().single();
      if (error) throw error;
      await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id, sender_id: user.user.id, body,
      });
      toast.success("Ticket aberto!");
      setOpen(false); setSubject(""); setBody(""); onDone();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo ticket</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Abrir novo ticket</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Assunto</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Geral</SelectItem>
                  <SelectItem value="deposit">Depósito</SelectItem>
                  <SelectItem value="withdrawal">Saque</SelectItem>
                  <SelectItem value="account">Conta / KYC</SelectItem>
                  <SelectItem value="investment">Investimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Mensagem</Label><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "..." : "Abrir ticket"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
