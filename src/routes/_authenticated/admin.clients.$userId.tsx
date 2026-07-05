import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Ban, Save, Snowflake, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/clients/$userId")({
  component: ClientDetail,
});

function ClientDetail() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client-detail", userId],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()).data,
  });

  const setStatus = useMutation({
    mutationFn: async (status: "active" | "frozen" | "blocked") => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["client-detail", userId] }); toast.success("Status atualizado"); },
  });

  if (isLoading) return <div className="text-center text-muted-foreground py-12">Carregando...</div>;
  if (!client) return <div className="text-center text-muted-foreground py-12">Cliente não encontrado.</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-xl gradient-primary text-lg font-bold text-primary-foreground">
            {(client.full_name || client.email).slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-xl font-bold">{client.email}</div>
            <div className="text-sm text-muted-foreground">
              {client.full_name || "Sem nome"} · Cadastro em {new Date(client.created_at).toLocaleDateString("pt-BR")}
            </div>
          </div>
          <StatusPill status={client.status} />
          <div className="flex gap-2">
            {client.status !== "frozen" && (
              <Button size="sm" variant="outline" onClick={() => setStatus.mutate("frozen")}><Snowflake className="h-4 w-4 mr-1" /> Congelar</Button>
            )}
            {client.status !== "active" && (
              <Button size="sm" variant="outline" onClick={() => setStatus.mutate("active")}><CheckCircle2 className="h-4 w-4 mr-1 text-up" /> Ativar</Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/admin/clients" })}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex flex-wrap w-full h-auto">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="kyc">KYC & Documentos</TabsTrigger>
          <TabsTrigger value="wallet">Carteira</TabsTrigger>
          <TabsTrigger value="bank">Contas Bancárias</TabsTrigger>
          <TabsTrigger value="tx">Transações</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="logs">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ProfileCard client={client} onSaved={() => qc.invalidateQueries({ queryKey: ["client-detail", userId] })} />
            <div className="space-y-4">
              <PermissionsCard userId={userId} />
              <AdminNoteCard userId={userId} />
              <BalanceAdjustCard userId={userId} email={client.email} />
              <DangerCard userId={userId} status={client.status} onDone={() => qc.invalidateQueries({ queryKey: ["client-detail", userId] })} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="kyc"><KycTab userId={userId} /></TabsContent>
        <TabsContent value="wallet"><WalletTab userId={userId} /></TabsContent>
        <TabsContent value="bank"><BankTab userId={userId} /></TabsContent>
        <TabsContent value="tx"><TxTab userId={userId} /></TabsContent>
        <TabsContent value="tickets"><TicketsTab userId={userId} /></TabsContent>
        <TabsContent value="logs"><LogsTab userId={userId} /></TabsContent>
      </Tabs>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-up/15 text-up border-up/30",
    frozen: "bg-warning/15 text-warning border-warning/30",
    blocked: "bg-down/15 text-down border-down/30",
  };
  return <span className={`inline-flex rounded-md border px-3 py-1 text-xs font-medium capitalize ${map[status]}`}>{status}</span>;
}

/* ---------- Profile ---------- */
function ProfileCard({ client, onSaved }: { client: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    full_name: client.full_name ?? "",
    date_of_birth: client.date_of_birth ?? "",
    postal_code: client.postal_code ?? "",
    city: client.city ?? "",
    country: client.country ?? "",
    full_address: client.full_address ?? "",
    phone: client.phone ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_update_profile" as any, {
        _user_id: client.id,
        _full_name: form.full_name || null,
        _date_of_birth: form.date_of_birth || null,
        _postal_code: form.postal_code || null,
        _city: form.city || null,
        _country: form.country || null,
        _full_address: form.full_address || null,
        _phone: form.phone || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Perfil atualizado"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card title="Dados pessoais" action={<Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}><Save className="h-4 w-4 mr-1" /> Salvar</Button>}>
      <div className="grid gap-3">
        <Field label="Nome completo"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data de nascimento"><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></Field>
          <Field label="Telefone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CEP"><Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></Field>
          <Field label="Cidade"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
        </div>
        <Field label="País"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
        <Field label="Endereço completo"><Textarea rows={2} value={form.full_address} onChange={(e) => setForm({ ...form, full_address: e.target.value })} /></Field>
      </div>
    </Card>
  );
}

/* ---------- Permissions ---------- */
function PermissionsCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["client-perms", userId],
    queryFn: async () => {
      const { data } = await supabase.from("client_permissions" as any).select("*").eq("user_id", userId).maybeSingle();
      return (data as any) ?? { allow_send: true, allow_buy: true, allow_swap: true, allow_deposit: true, allow_withdrawal: true, allow_stake: true };
    },
  });

  const [local, setLocal] = useState<any>(null);
  useEffect(() => { if (data) setLocal(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_permissions" as any).upsert({ user_id: userId, ...local, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Permissões salvas"); qc.invalidateQueries({ queryKey: ["client-perms", userId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!local) return null;
  const toggles: Array<[keyof typeof local, string]> = [
    ["allow_send", "Enviar"], ["allow_buy", "Comprar"], ["allow_swap", "Trocar"],
    ["allow_deposit", "Depositar"], ["allow_withdrawal", "Sacar"], ["allow_stake", "Fazer stake"],
  ];
  return (
    <Card title="Permissões do cliente" action={<Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}><Save className="h-4 w-4 mr-1" /> Salvar</Button>}>
      <div className="space-y-3">
        {toggles.map(([k, label]) => (
          <div key={String(k)} className="flex items-center justify-between rounded-md bg-surface-elevated px-3 py-2">
            <span className="text-sm">{label}</span>
            <Switch checked={!!local[k]} onCheckedChange={(v) => setLocal({ ...local, [k]: v })} />
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------- Admin note ---------- */
function AdminNoteCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["client-note", userId],
    queryFn: async () => (await supabase.from("client_admin_notes" as any).select("note").eq("user_id", userId).maybeSingle()).data as any,
  });
  const [note, setNote] = useState("");
  useEffect(() => { setNote(data?.note ?? ""); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_admin_notes" as any).upsert({ user_id: userId, note, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Nota salva"); qc.invalidateQueries({ queryKey: ["client-note", userId] }); },
  });

  return (
    <Card title="Nota interna do admin" action={<Button size="sm" onClick={() => save.mutate()}><Save className="h-4 w-4 mr-1" /> Salvar</Button>}>
      <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anotações visíveis apenas para admin/agentes..." />
    </Card>
  );
}

/* ---------- Balance adjust ---------- */
function BalanceAdjustCard({ userId, email }: { userId: string; email: string }) {
  const [currencyId, setCurrencyId] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const { data: currencies } = useQuery({
    queryKey: ["currencies"],
    queryFn: async () => (await supabase.from("currencies").select("*").eq("active", true)).data ?? [],
  });

  async function submit() {
    if (!currencyId || !delta) return toast.error("Preencha moeda e valor");
    const { error } = await supabase.rpc("admin_adjust_balance", {
      _user_id: userId, _currency_id: currencyId, _delta: Number(delta), _reason: reason || `manual: ${email}`,
    });
    if (error) return toast.error(error.message);
    toast.success("Saldo ajustado"); setDelta(""); setReason("");
  }

  return (
    <Card title="Ajustar saldo">
      <div className="space-y-2">
        <select value={currencyId} onChange={(e) => setCurrencyId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
          <option value="">Selecione a moeda...</option>
          {currencies?.map((c: any) => <option key={c.id} value={c.id}>{c.symbol} — {c.name}</option>)}
        </select>
        <Input type="number" step="0.00000001" placeholder="Valor (negativo para debitar)" value={delta} onChange={(e) => setDelta(e.target.value)} />
        <Input placeholder="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button className="w-full" onClick={submit}>Confirmar ajuste</Button>
      </div>
    </Card>
  );
}

/* ---------- Danger ---------- */
function DangerCard({ userId, status, onDone }: { userId: string; status: string; onDone: () => void }) {
  async function ban() {
    if (!confirm("Bloquear este cliente? Ele não poderá fazer login.")) return;
    const { error } = await supabase.from("profiles").update({ status: "blocked" }).eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success("Cliente bloqueado"); onDone();
  }
  return (
    <div className="rounded-xl border border-down/40 bg-down/5 p-4">
      <div className="text-sm font-semibold text-down">Zona de perigo</div>
      <p className="mt-1 text-xs text-muted-foreground">Bloquear impede login e transações. Ação reversível.</p>
      <Button variant="destructive" size="sm" className="mt-3" onClick={ban} disabled={status === "blocked"}>
        <Ban className="h-4 w-4 mr-1" /> {status === "blocked" ? "Já bloqueado" : "Bloquear conta"}
      </Button>
    </div>
  );
}

/* ---------- KYC ---------- */
function KycTab({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["client-kyc", userId],
    queryFn: async () => (await supabase.from("kyc_submissions").select("*").eq("user_id", userId).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <Card title="Submissões KYC">
      {!data?.length ? <Empty text="Sem submissões." /> : (
        <div className="space-y-2">
          {data.map((k: any) => (
            <div key={k.id} className="flex items-center justify-between rounded-md bg-surface-elevated px-3 py-2 text-sm">
              <div>
                <div className="font-medium capitalize">{k.document_type} · {k.status}</div>
                <div className="text-xs text-muted-foreground">{new Date(k.created_at).toLocaleString("pt-BR")}</div>
              </div>
              <Link to="/admin/kyc" className="text-xs text-primary hover:underline">Revisar →</Link>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------- Wallet ---------- */
function WalletTab({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["client-wallets", userId],
    queryFn: async () => (await supabase.from("wallets").select("*, currencies(*)").eq("user_id", userId)).data ?? [],
  });
  return (
    <Card title="Carteiras">
      {!data?.length ? <Empty text="Nenhuma carteira." /> : (
        <Table>
          <TableHeader><TableRow><TableHead>Moeda</TableHead><TableHead className="text-right">Disponível</TableHead><TableHead className="text-right">Bloqueado</TableHead></TableRow></TableHeader>
          <TableBody>
            {data.map((w: any) => (
              <TableRow key={w.id}>
                <TableCell>{w.currencies?.symbol} — {w.currencies?.name}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(w.available).toFixed(8)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{Number(w.locked).toFixed(8)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

/* ---------- Bank ---------- */
function BankTab({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["client-banks", userId],
    queryFn: async () => (await supabase.from("bank_accounts" as any).select("*").eq("user_id", userId)).data as any[] ?? [],
  });
  return (
    <Card title="Contas bancárias">
      <p className="mb-3 text-xs text-muted-foreground">Por segurança, apenas os últimos 4 dígitos são exibidos.</p>
      {!data?.length ? <Empty text="Nenhuma conta bancária cadastrada." /> : (
        <div className="space-y-2">
          {data.map((b: any) => (
            <div key={b.id} className="rounded-md bg-surface-elevated px-3 py-2 text-sm">
              <div className="font-medium">{b.bank_name} · •••• {b.last4}</div>
              <div className="text-xs text-muted-foreground">{b.account_holder} · {b.country ?? "—"}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------- Transactions ---------- */
function TxTab({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["client-tx", userId],
    queryFn: async () => (await supabase.from("transactions").select("*, currencies(symbol)").eq("user_id", userId).order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  return (
    <Card title="Últimas 100 transações">
      {!data?.length ? <Empty text="Sem transações." /> : (
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Moeda</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {data.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="text-xs">{new Date(t.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="capitalize">{t.type}</TableCell>
                <TableCell>{t.currencies?.symbol}</TableCell>
                <TableCell className={`text-right tabular-nums ${Number(t.amount) < 0 ? "text-down" : "text-up"}`}>{Number(t.amount).toFixed(8)}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{t.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

/* ---------- Tickets ---------- */
function TicketsTab({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["client-tickets", userId],
    queryFn: async () => (await supabase.from("support_tickets").select("*").eq("user_id", userId).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <Card title="Tickets de suporte">
      {!data?.length ? <Empty text="Nenhum ticket." /> : (
        <div className="space-y-2">
          {data.map((t: any) => (
            <Link key={t.id} to="/admin/tickets/$ticketId" params={{ ticketId: t.id }} className="block rounded-md bg-surface-elevated px-3 py-2 hover:bg-surface transition">
              <div className="flex items-center justify-between">
                <div className="font-medium">{t.subject}</div>
                <Badge variant="outline" className="capitalize">{t.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")}</div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------- Audit logs ---------- */
function LogsTab({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["client-logs", userId],
    queryFn: async () => (await supabase.from("audit_logs").select("*").eq("target_id", userId).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  return (
    <Card title="Auditoria (últimas 50 ações)">
      {!data?.length ? <Empty text="Sem registros." /> : (
        <div className="space-y-1 text-sm">
          {data.map((l: any) => (
            <div key={l.id} className="flex items-start justify-between gap-3 rounded-md bg-surface-elevated px-3 py-2">
              <div>
                <div className="font-medium">{l.action}</div>
                {l.metadata && <div className="text-xs text-muted-foreground font-mono">{JSON.stringify(l.metadata)}</div>}
              </div>
              <div className="whitespace-nowrap text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------- helpers ---------- */
function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}
function Empty({ text }: { text: string }) {
  return <div className="py-8 text-center text-sm text-muted-foreground">{text}</div>;
}
