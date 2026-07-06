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
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/app/support")({
  component: SupportPage,
});

function SupportPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isDetail = pathname !== "/app/support";

  const { data: tickets, isLoading, error } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: async () => (await supabase.from("support_tickets").select("*").order("created_at",{ascending:false})).data ?? [],
  });

  if (isDetail) return <Outlet />;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("support.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("support.subtitle")}</p>
        </div>
        <NewTicket onDone={() => qc.invalidateQueries({ queryKey: ["my-tickets"] })} />
      </div>

      <div className="rounded-sm border border-border bg-surface divide-y divide-border">
        {isLoading && <div className="p-12 text-center text-muted-foreground">{t("common.loading")}</div>}
        {error && <div className="p-6 text-sm text-down">{(error as Error).message}</div>}
        {tickets?.map((tk: any) => (
          <Link key={tk.id} to="/app/support/$ticketId" params={{ ticketId: tk.id }}
            className="flex items-center gap-3 p-4 hover:bg-surface-elevated transition">
            <MessageCircle className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{tk.subject}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(tk.created_at).toLocaleString(i18n.language)} · {t(`support.categories.${tk.category}`, { defaultValue: tk.category })}
              </div>
            </div>
            <Badge variant="outline">{t(`support.priorities.${tk.priority}`, { defaultValue: tk.priority })}</Badge>
            <Badge variant="outline">{t(`support.statuses.${tk.status}`, { defaultValue: tk.status })}</Badge>
          </Link>
        ))}
        {tickets?.length === 0 && !isLoading && !error && <div className="p-12 text-center text-muted-foreground">{t("support.empty")}</div>}
      </div>
    </div>
  );
}

function NewTicket({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!subject || !body) return toast.error(t("support.fillSubjectMsg"));
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error(t("support.notAuth"));
      const { data: ticket, error } = await supabase.from("support_tickets").insert({
        user_id: user.user.id, subject, category, priority,
      }).select().single();
      if (error) throw error;
      await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id, sender_id: user.user.id, body,
      });
      toast.success(t("support.ticketOpened"));
      setOpen(false); setSubject(""); setBody(""); onDone();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> {t("support.newTicket")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("support.openTicket")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>{t("support.subject")}</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>{t("support.category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{t("support.categories.general")}</SelectItem>
                  <SelectItem value="deposit">{t("support.categories.deposit")}</SelectItem>
                  <SelectItem value="withdrawal">{t("support.categories.withdrawal")}</SelectItem>
                  <SelectItem value="account">{t("support.categories.account")}</SelectItem>
                  <SelectItem value="investment">{t("support.categories.investment")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>{t("support.priority")}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("support.priorities.low")}</SelectItem>
                  <SelectItem value="normal">{t("support.priorities.normal")}</SelectItem>
                  <SelectItem value="high">{t("support.priorities.high")}</SelectItem>
                  <SelectItem value="urgent">{t("support.priorities.urgent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>{t("support.message")}</Label><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "..." : t("support.openTicket")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
