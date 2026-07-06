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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Ban, Save, Snowflake, CheckCircle2, Check, X, Plus, Upload, QrCode, Eye, Pencil, LifeBuoy, MessageCircle, Wallet as WalletIcon, Ticket as TicketIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useServerFn } from "@tanstack/react-start";
import { getMarketPrices } from "@/lib/prices.functions";

const KPI_PALETTE = ["#f7931a", "#627eea", "#26a17b", "#f0b90b", "#14f195", "#8247e5", "#e84142", "#0033ad"];

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

      <ClientKpiHeader userId={userId} />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex flex-wrap w-full h-auto">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="wallet">Carteira</TabsTrigger>
          <TabsTrigger value="tx">Transações</TabsTrigger>
          <TabsTrigger value="support"><LifeBuoy className="h-4 w-4 mr-1" /> Suporte</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ProfileCard client={client} onSaved={() => qc.invalidateQueries({ queryKey: ["client-detail", userId] })} />
            <div className="space-y-4">
              <PermissionsCard userId={userId} />
              <KycIsland userId={userId} />
              <AdminNoteCard userId={userId} />
              <DangerCard userId={userId} status={client.status} onDone={() => qc.invalidateQueries({ queryKey: ["client-detail", userId] })} />
            </div>
          </div>
        </TabsContent>



        <TabsContent value="wallet"><WalletTab userId={userId} /></TabsContent>
        <TabsContent value="tx"><TxTab userId={userId} /></TabsContent>
        <TabsContent value="support"><SupportTab userId={userId} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Support tickets for this client ---------- */
function SupportTab({ userId }: { userId: string }) {
  const { data: tickets } = useQuery({
    queryKey: ["admin-client-tickets", userId],
    queryFn: async () => (await supabase.from("support_tickets").select("*").eq("user_id", userId).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="border-b border-border px-5 py-3 text-sm font-semibold">Tickets deste cliente</div>
      {!tickets?.length ? (
        <div className="p-12 text-center text-sm text-muted-foreground">Sem tickets.</div>
      ) : (
        <div className="divide-y divide-border">
          {tickets.map((t: any) => (
            <Link key={t.id} to="/admin/tickets/$ticketId" params={{ ticketId: t.id }}
              className="flex items-center gap-3 px-5 py-3 hover:bg-surface-elevated transition">
              <MessageCircle className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-sm">{t.subject}</div>
                <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()} · {t.category}</div>
              </div>
              <Badge variant="outline" className="capitalize text-xs">{t.priority}</Badge>
              <Badge variant="outline" className="capitalize text-xs">{t.status}</Badge>
            </Link>
          ))}
        </div>
      )}
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

/* ---------- Permissions (compact grid) ---------- */
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
  const toggles: Array<[string, string]> = [
    ["allow_send", "Enviar"], ["allow_buy", "Comprar"], ["allow_swap", "Trocar"],
    ["allow_deposit", "Depositar"], ["allow_withdrawal", "Sacar"], ["allow_stake", "Stake"],
  ];
  return (
    <Card title="Permissões" action={<Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}><Save className="h-4 w-4 mr-1" /> Salvar</Button>}>
      <div className="grid grid-cols-2 gap-2">
        {toggles.map(([k, label]) => (
          <label key={k} className="flex items-center justify-between rounded-md bg-surface-elevated px-3 py-2 cursor-pointer">
            <span className="text-sm">{label}</span>
            <Switch checked={!!local[k]} onCheckedChange={(v) => setLocal({ ...local, [k]: v })} />
          </label>
        ))}
      </div>
    </Card>
  );
}

/* ---------- KYC island (list + review) ---------- */
function KycIsland({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["client-kyc-island", userId],
    queryFn: async () => (await supabase.from("kyc_submissions").select("*").eq("user_id", userId).order("created_at", { ascending: false })).data ?? [],
  });

  const [viewer, setViewer] = useState<{ sub: any; doc?: string; selfie?: string } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function openViewer(sub: any) {
    const [d, s] = await Promise.all([
      sub.document_path ? supabase.storage.from("kyc-documents").createSignedUrl(sub.document_path, 300) : Promise.resolve({ data: null }),
      sub.selfie_path ? supabase.storage.from("kyc-documents").createSignedUrl(sub.selfie_path, 300) : Promise.resolve({ data: null }),
    ]);
    setViewer({ sub, doc: (d.data as any)?.signedUrl, selfie: (s.data as any)?.signedUrl });
  }

  async function review(id: string, approve: boolean) {
    const note = notes[id] ?? "";
    if (!approve && !note.trim()) return toast.error("Informe o motivo da recusa");
    const { error } = await supabase.rpc("admin_review_kyc", { _id: id, _approve: approve, _notes: note });
    if (error) return toast.error(error.message);
    toast.success(approve ? "KYC aprovado" : "KYC recusado");
    qc.invalidateQueries({ queryKey: ["client-kyc-island", userId] });
    qc.invalidateQueries({ queryKey: ["client-detail", userId] });
  }

  return (
    <Card title="KYC & Documentos">
      {!data?.length ? (
        <div className="py-4 text-center text-sm text-muted-foreground">Cliente ainda não enviou documentos.</div>
      ) : (
        <div className="space-y-2">
          {data.map((k: any) => (
            <div key={k.id} className="rounded-md bg-surface-elevated p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{k.full_name || k.doc_type} · {k.doc_number}</div>
                  <div className="text-xs text-muted-foreground">{new Date(k.created_at).toLocaleString("pt-BR")}</div>
                </div>
                <Badge variant="outline" className={
                  k.status === "approved" ? "border-up/40 text-up" :
                  k.status === "rejected" ? "border-down/40 text-down" :
                  "border-warning/40 text-warning"
                }>{k.status}</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openViewer(k)}><Eye className="h-4 w-4 mr-1" /> Ver docs</Button>
              </div>
              {k.status === "pending" && (
                <div className="space-y-2">
                  <Textarea rows={2} placeholder="Nota (obrigatório para recusar)"
                    value={notes[k.id] ?? ""} onChange={(e) => setNotes({ ...notes, [k.id]: e.target.value })} />
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-up hover:bg-up/90 text-white" onClick={() => review(k.id, true)}>
                      <Check className="h-4 w-4 mr-1" /> Autorizar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => review(k.id, false)}>
                      <X className="h-4 w-4 mr-1" /> Reprovar
                    </Button>
                  </div>
                </div>
              )}
              {k.review_notes && k.status !== "pending" && (
                <div className="text-xs text-muted-foreground border-t border-border pt-2">Nota: {k.review_notes}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!viewer} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Documentos KYC</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium">Documento</div>
              {viewer?.doc ? <img src={viewer.doc} className="rounded border border-border w-full" /> : <div className="text-sm text-muted-foreground">—</div>}
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Bank statement</div>
              {viewer?.selfie ? <img src={viewer.selfie} className="rounded border border-border w-full" /> : <div className="text-sm text-muted-foreground">—</div>}
            </div>

          </div>
        </DialogContent>
      </Dialog>
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
    <Card title="Nota interna" action={<Button size="sm" onClick={() => save.mutate()}><Save className="h-4 w-4 mr-1" /> Salvar</Button>}>
      <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anotações visíveis apenas para equipe..." />
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
      <Button variant="destructive" size="sm" className="mt-2" onClick={ban} disabled={status === "blocked"}>
        <Ban className="h-4 w-4 mr-1" /> {status === "blocked" ? "Já bloqueado" : "Bloquear conta"}
      </Button>
    </div>
  );
}

/* =============== WALLET TAB =============== */
function WalletTab({ userId }: { userId: string }) {
  return (
    <div className="space-y-4">
      <WalletsIsland userId={userId} />
      <DepositRequestsIsland userId={userId} />
      <BankAccountsIsland userId={userId} />
    </div>
  );
}

function WalletsIsland({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["client-wallets", userId],
    queryFn: async () => (await supabase.from("wallets").select("*, currencies(*)").eq("user_id", userId)).data ?? [],
  });
  return (
    <Card title="Saldos">
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

function DepositRequestsIsland({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["client-deposit-addresses", userId],
    queryFn: async () => (await supabase.from("deposit_addresses" as any).select("*, currencies(symbol,name,network)").eq("user_id", userId).order("created_at", { ascending: false })).data ?? [],
    refetchInterval: 15000,
  });
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <Card title="Solicitações de endereços de depósito">
      {!data?.length ? (
        <Empty text="Cliente ainda não solicitou nenhum endereço." />
      ) : (
        <div className="space-y-2">
          {(data as any[]).map((d) => (
            <div key={d.id} className="rounded-md bg-surface-elevated p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{d.currencies?.symbol} · {d.currencies?.name}
                    {d.currencies?.network && <span className="text-xs text-muted-foreground"> · {d.currencies.network}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString("pt-BR")}</div>
                  {d.status === "ready" && <div className="text-xs font-mono break-all mt-1">{d.address}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={d.status === "ready" ? "default" : "secondary"}>{d.status === "ready" ? "Pronto" : "Pendente"}</Badge>
                  <Button size="sm" variant="outline" onClick={() => setEditing(d)}>
                    <Upload className="h-4 w-4 mr-1" /> {d.status === "ready" ? "Atualizar" : "Cadastrar"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <DepositEditDialog record={editing} onClose={() => setEditing(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ["client-deposit-addresses", userId] }); setEditing(null); }} />
      )}
    </Card>
  );
}

function DepositEditDialog({ record, onClose, onSaved }: { record: any; onClose: () => void; onSaved: () => void }) {
  const [address, setAddress] = useState(record.address ?? "");
  const [network, setNetwork] = useState(record.network ?? record.currencies?.network ?? "");
  const [memo, setMemo] = useState(record.memo_tag ?? "");
  const [notes, setNotes] = useState(record.notes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!address) return toast.error("Informe o endereço");
    setSaving(true);
    try {
      let qrPath: string | null = record.qr_image_path ?? null;
      if (file) {
        const path = `${record.user_id}/${record.id}-${Date.now()}.png`;
        const up = await supabase.storage.from("deposit-qr").upload(path, file, { upsert: true, contentType: file.type });
        if (up.error) throw up.error;
        qrPath = path;
      }
      const { error } = await supabase.rpc("admin_set_deposit_address" as any, {
        _id: record.id, _address: address, _network: network || null,
        _memo_tag: memo || null, _qr_image_path: qrPath, _notes: notes || null,
      });
      if (error) throw error;
      toast.success("Endereço enviado ao cliente");
      onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Cadastrar endereço · {record.currencies?.symbol}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Endereço da carteira</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x... / bc1..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Rede</Label><Input value={network} onChange={(e) => setNetwork(e.target.value)} placeholder="ERC20, BEP20..." /></div>
            <div><Label>Memo / Tag (opcional)</Label><Input value={memo} onChange={(e) => setMemo(e.target.value)} /></div>
          </div>
          <div>
            <Label className="flex items-center gap-2"><QrCode className="h-4 w-4" /> QR code (PNG/JPG)</Label>
            <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {record.qr_image_path && !file && <p className="text-xs text-muted-foreground mt-1">Já existe um QR cadastrado. Envie um novo para substituir.</p>}
          </div>
          <div><Label>Observações (opcional)</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar & notificar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BankAccountsIsland({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["client-banks", userId],
    queryFn: async () => (await supabase.from("bank_accounts" as any).select("*").eq("user_id", userId)).data as any[] ?? [],
  });
  return (
    <Card title="Contas bancárias conectadas">
      <p className="mb-3 text-xs text-muted-foreground">Por segurança, apenas os últimos 4 dígitos são exibidos.</p>
      {!data?.length ? <Empty text="Nenhuma conta bancária conectada." /> : (
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

/* =============== TRANSACTIONS TAB =============== */
function TxTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editTx, setEditTx] = useState<any | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const { data } = useQuery({
    queryKey: ["client-tx", userId],
    queryFn: async () => (await supabase.from("transactions").select("*, currencies(symbol,name,usd_price)").eq("user_id", userId).order("created_at", { ascending: false }).limit(200)).data ?? [],
    refetchInterval: 15000,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data;
    if (filter === "pending") return data.filter((t: any) => t.status === "pending");
    return data.filter((t: any) => t.status === filter);
  }, [data, filter]);

  function refresh() { qc.invalidateQueries({ queryKey: ["client-tx", userId] }); qc.invalidateQueries({ queryKey: ["client-wallets", userId] }); }

  return (
    <Card
      title="Histórico de transações"
      action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Adicionar transação</Button>}
    >
      <div className="flex gap-1 mb-3 flex-wrap">
        {[
          ["all", "Todas"], ["pending", "Pendente"], ["completed", "Aprovadas"], ["rejected", "Recusadas"],
        ].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`text-xs rounded-md px-3 py-1 border ${filter === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>
      {!filtered.length ? <Empty text="Sem transações." /> : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Moeda</TableHead>
            <TableHead className="text-right">Valor</TableHead><TableHead className="text-right">USD</TableHead>
            <TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((t: any) => (
              <TableRow key={t.id} className={t.hidden ? "opacity-50" : ""}>
                <TableCell className="text-xs">{new Date(t.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="capitalize">{t.type}</TableCell>
                <TableCell>{t.currencies?.symbol}</TableCell>
                <TableCell className={`text-right tabular-nums ${Number(t.amount) < 0 ? "text-down" : "text-up"}`}>{Number(t.amount).toFixed(8)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">${Number(t.usd_value ?? (Number(t.currencies?.usd_price ?? 0) * Math.abs(Number(t.amount)))).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    t.status === "completed" ? "border-up/40 text-up" :
                    t.status === "rejected" ? "border-down/40 text-down" :
                    "border-warning/40 text-warning"
                  }>{(t.metadata?.ui_status || t.status)}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => setEditTx(t)}><Pencil className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {addOpen && <TxDialog userId={userId} onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); refresh(); }} />}
      {editTx && <TxEditDialog tx={editTx} onClose={() => setEditTx(null)} onSaved={() => { setEditTx(null); refresh(); }} />}
    </Card>
  );
}

const TX_STATUSES: Array<[string, string]> = [
  ["hold", "Hold"], ["processing", "Processing"], ["approved", "Aprovada"], ["rejected", "Recusada"],
];
const TX_TYPES: Array<[string, string]> = [
  ["deposit", "Depósito"], ["withdrawal", "Saque"], ["adjustment", "Ajuste"], ["transfer", "Transferência"],
];

function TxDialog({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const { data: currencies } = useQuery({
    queryKey: ["currencies-active"],
    queryFn: async () => (await supabase.from("currencies").select("*").eq("active", true).order("symbol")).data ?? [],
  });
  const [type, setType] = useState<string>("deposit");
  const [currencyId, setCurrencyId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<string>("hold");
  const [txHash, setTxHash] = useState("");
  const [sender, setSender] = useState("");
  const [note, setNote] = useState("");
  const [hidden, setHidden] = useState(false);
  const [txDate, setTxDate] = useState<string>(() => {
    const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16);
  });
  const [saving, setSaving] = useState(false);

  const currency = currencies?.find((c: any) => c.id === currencyId);
  const usd = currency ? (Number(amount || 0) * Number(currency.usd_price ?? 0)) : 0;

  async function submit() {
    if (!currencyId) return toast.error("Selecione a moeda");
    if (!amount || Number(amount) <= 0) return toast.error("Informe um valor válido");
    setSaving(true);
    const { error } = await supabase.rpc("admin_add_transaction" as any, {
      _user_id: userId,
      _type: type,
      _currency_id: currencyId,
      _amount: Number(amount),
      _status: status,
      _tx_hash: txHash || null,
      _sender_address: sender || null,
      _note: note || null,
      _hidden: hidden,
      _tx_date: new Date(txDate).toISOString(),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Transação adicionada");
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Adicionar transação</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TX_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Moeda">
              <Select value={currencyId} onValueChange={setCurrencyId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{currencies?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.symbol} — {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Data/hora da transação">
            <Input type="datetime-local" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
          </Field>
          <Field label={`Valor (na moeda${currency ? ` — ${currency.symbol}` : ""})`}>
            <Input type="number" step="0.00000001" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {currency && amount && (
              <div className="text-xs text-muted-foreground mt-1">≈ ${usd.toFixed(2)} USD (cotação atual: ${Number(currency.usd_price ?? 0).toFixed(2)})</div>
            )}
          </Field>
          <Field label="Transaction ID (hash) — opcional">
            <Input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x..." />
          </Field>
          <Field label="Endereço remetente — opcional">
            <Input value={sender} onChange={(e) => setSender(e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TX_STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Nota para o cliente">
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: depósito confirmado, aguarde compensação..." />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={hidden} onCheckedChange={setHidden} />
            Ocultar transação do cliente
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Adicionar transação"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TxEditDialog({ tx, onClose, onSaved }: { tx: any; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<string>(tx.metadata?.ui_status || tx.status || "hold");
  const [note, setNote] = useState(tx.note ?? "");
  const [hidden, setHidden] = useState<boolean>(!!tx.hidden);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    const { error } = await supabase.rpc("admin_update_transaction" as any, {
      _tx_id: tx.id, _status: status, _note: note, _hidden: hidden,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Transação atualizada"); onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar transação</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground font-mono break-all">ID: {tx.id}</div>
          <div className="text-sm">
            <span className="capitalize">{tx.type}</span> · {Number(tx.amount).toFixed(8)} {tx.currencies?.symbol}
          </div>
          <Field label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TX_STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Nota para o cliente">
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={hidden} onCheckedChange={setHidden} />
            Ocultar do cliente
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

/* ---------- KPI Header: donut + stats ---------- */
function ClientKpiHeader({ userId }: { userId: string }) {
  const pricesFn = useServerFn(getMarketPrices);

  const { data: wallets } = useQuery({
    queryKey: ["client-detail-wallets", userId],
    queryFn: async () => (await supabase.from("wallets").select("*, currencies(*)").eq("user_id", userId)).data ?? [],
  });
  const { data: pendingTx } = useQuery({
    queryKey: ["client-detail-pending-tx", userId],
    queryFn: async () => (await supabase.from("transactions").select("id").eq("user_id", userId).eq("status", "pending")).data ?? [],
  });
  const { data: openTickets } = useQuery({
    queryKey: ["client-detail-open-tickets", userId],
    queryFn: async () => (await supabase.from("support_tickets").select("id").eq("user_id", userId).in("status", ["open", "pending"])).data ?? [],
  });

  const cgIds = useMemo(
    () => Array.from(new Set((wallets ?? []).map((w: any) => w.currencies?.coingecko_id).filter(Boolean))) as string[],
    [wallets],
  );
  const { data: pricesRes } = useQuery({
    queryKey: ["client-detail-prices", cgIds.join(",")],
    queryFn: () => pricesFn({ data: { ids: cgIds.length ? cgIds : ["bitcoin"] } }),
    enabled: cgIds.length > 0,
    refetchInterval: 60000,
  });
  const prices = (pricesRes as any)?.data ?? {};

  const rows = (wallets ?? []).map((w: any) => {
    const cg = w.currencies?.coingecko_id;
    const price = cg ? prices[cg]?.usd ?? 0 : w.currencies?.symbol === "USDT" ? 1 : 0;
    const total = Number(w.available) + Number(w.locked);
    return { symbol: w.currencies?.symbol ?? "?", value: total * price, total };
  }).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);

  const totalUsd = rows.reduce((s, r) => s + r.value, 0);
  const chartData = rows.map((r, i) => ({ name: r.symbol, value: r.value, color: KPI_PALETTE[i % KPI_PALETTE.length] }));

  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-surface via-surface to-surface-elevated p-5 shadow-sm">
      <div className="grid gap-6 items-center md:grid-cols-[200px_1fr]">
        <div className="mx-auto md:mx-0">
          <div className="relative h-[180px] w-[180px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" innerRadius={56} outerRadius={84} paddingAngle={3} stroke="none" cornerRadius={4}>
                    {chartData.map((c) => <Cell key={c.name} fill={c.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full w-full place-items-center rounded-full border-[8px] border-dashed border-border">
                <WalletIcon className="h-8 w-8 opacity-40" />
              </div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-[9px] uppercase text-muted-foreground">USD</div>
              <div className="text-sm font-black tabular-nums">${totalUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}</div>
              <div className="text-[9px] text-muted-foreground">{rows.length} ativos</div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile icon={WalletIcon} label="Patrimônio" value={`$${totalUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`} sub={`${rows.length} moeda(s) com saldo`} />
          <KpiTile icon={Clock} label="Tx pendentes" value={pendingTx?.length ?? 0} sub="Aguardando revisão" accent={pendingTx?.length ? "warning" : undefined} />
          <KpiTile icon={TicketIcon} label="Tickets abertos" value={openTickets?.length ?? 0} sub="Suporte em andamento" accent={openTickets?.length ? "down" : undefined} />
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-1.5">
          {chartData.slice(0, 12).map((c) => (
            <div key={c.name} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
              <span className="font-medium truncate">{c.name}</span>
              <span className="ml-auto tabular-nums text-muted-foreground">{totalUsd ? ((c.value / totalUsd) * 100).toFixed(1) : 0}%</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function KpiTile({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: any; sub?: string; accent?: "warning" | "down" }) {
  const color = accent === "warning" ? "text-warning" : accent === "down" ? "text-down" : "text-primary";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="mt-2 text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
