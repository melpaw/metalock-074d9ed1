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
import { useTranslation } from "react-i18next";

const KPI_PALETTE = ["#f7931a", "#627eea", "#26a17b", "#f0b90b", "#14f195", "#8247e5", "#e84142", "#0033ad"];

export const Route = createFileRoute("/_authenticated/admin/clients/$userId")({
  component: ClientDetail,
});

function ClientDetail() {
  const { t, i18n } = useTranslation();
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["client-detail", userId] }); toast.success(t("admin.statusUpdated")); },
  });

  if (isLoading) return <div className="text-center text-muted-foreground py-12">{t("common.loading")}</div>;
  if (!client) return <div className="text-center text-muted-foreground py-12">{t("admin.clientNotFound")}</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-sm gradient-primary text-lg font-bold text-primary-foreground">
            {(client.full_name || client.email).slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-xl font-bold">{client.email}</div>
            <div className="text-sm text-muted-foreground">
              {client.full_name || t("admin.noName")} · {t("admin.signupDate")} {new Date(client.created_at).toLocaleDateString(i18n.language)}
            </div>
          </div>
          <StatusPill status={client.status} />
          <div className="flex gap-2">
            {client.status !== "frozen" && (
              <Button size="sm" variant="outline" onClick={() => setStatus.mutate("frozen")}><Snowflake className="h-4 w-4 mr-1" /> {t("admin.freeze")}</Button>
            )}
            {client.status !== "active" && (
              <Button size="sm" variant="outline" onClick={() => setStatus.mutate("active")}><CheckCircle2 className="h-4 w-4 mr-1 text-up" /> {t("admin.activate")}</Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/admin/clients" })}>
              <ArrowLeft className="h-4 w-4 mr-1" /> {t("common.back")}
            </Button>
          </div>
        </div>
      </div>

      <ClientKpiHeader userId={userId} />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex flex-wrap w-full h-auto">
          <TabsTrigger value="profile">{t("nav.profile")}</TabsTrigger>
          <TabsTrigger value="wallet">{t("nav.wallet")}</TabsTrigger>
          <TabsTrigger value="tx">{t("nav.transactions")}</TabsTrigger>
          <TabsTrigger value="support"><LifeBuoy className="h-4 w-4 mr-1" /> {t("nav.support")}</TabsTrigger>
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
  const { t, i18n } = useTranslation();
  const { data: tickets } = useQuery({
    queryKey: ["admin-client-tickets", userId],
    queryFn: async () => (await supabase.from("support_tickets").select("*").eq("user_id", userId).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="rounded-sm border border-border bg-surface overflow-hidden">
      <div className="border-b border-border px-5 py-3 text-sm font-semibold">{t("admin.clientTickets")}</div>
      {!tickets?.length ? (
        <div className="p-12 text-center text-sm text-muted-foreground">{t("support.emptyAdmin")}</div>
      ) : (
        <div className="divide-y divide-border">
          {tickets.map((ticket: any) => (
            <Link key={ticket.id} to="/admin/tickets/$ticketId" params={{ ticketId: ticket.id }}
              className="flex items-center gap-3 px-5 py-3 hover:bg-surface-elevated transition">
              <MessageCircle className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-sm">{ticket.subject}</div>
                <div className="text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleString(i18n.language)} · {t(`support.categories.${ticket.category}`, { defaultValue: ticket.category })}</div>
              </div>
              <Badge variant="outline" className="text-xs">{t(`support.priorities.${ticket.priority}`, { defaultValue: ticket.priority })}</Badge>
              <Badge variant="outline" className="text-xs">{t(`support.statuses.${ticket.status}`, { defaultValue: ticket.status })}</Badge>
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
  const { t } = useTranslation();
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
    onSuccess: () => { toast.success(t("profile.info.saved")); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card title={t("admin.personalData")} action={<Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}><Save className="h-4 w-4 mr-1" /> {t("common.save")}</Button>}>
      <div className="grid gap-3">
        <Field label={t("profile.info.fullName")}><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("profile.info.dob")}><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></Field>
          <Field label={t("profile.info.phone")}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("profile.info.postal")}><Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></Field>
          <Field label={t("profile.info.city")}><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
        </div>
        <Field label={t("profile.info.country")}><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
        <Field label={t("profile.info.address")}><Textarea rows={2} value={form.full_address} onChange={(e) => setForm({ ...form, full_address: e.target.value })} /></Field>
      </div>
    </Card>
  );
}

/* ---------- Permissions (compact grid) ---------- */
function PermissionsCard({ userId }: { userId: string }) {
  const { t } = useTranslation();
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
    onSuccess: () => { toast.success(t("admin.permissionsUpdated")); qc.invalidateQueries({ queryKey: ["client-perms", userId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!local) return null;
  const toggles: Array<[string, string]> = [
    ["allow_send", t("wallet.send")], ["allow_buy", t("market.buy")], ["allow_swap", t("wallet.swap")],
    ["allow_deposit", t("wallet.deposit")], ["allow_withdrawal", t("wallet.withdraw")], ["allow_stake", t("plans.invest")],
  ];
  return (
    <Card title={t("admin.permissions")} action={<Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}><Save className="h-4 w-4 mr-1" /> {t("common.save")}</Button>}>
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
  const { t, i18n } = useTranslation();
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
    if (!approve && !note.trim()) return toast.error(t("admin.rejectionReasonRequired"));
    const { error } = await supabase.rpc("admin_review_kyc", { _id: id, _approve: approve, _notes: note });
    if (error) return toast.error(error.message);
    toast.success(approve ? t("admin.kycApproved") : t("admin.kycRejectedToast"));
    qc.invalidateQueries({ queryKey: ["client-kyc-island", userId] });
    qc.invalidateQueries({ queryKey: ["client-detail", userId] });
  }

  return (
    <Card title={t("profile.tabs.kyc")}>
      {!data?.length ? (
        <div className="py-4 text-center text-sm text-muted-foreground">{t("admin.noClientDocuments")}</div>
      ) : (
        <div className="space-y-2">
          {data.map((k: any) => (
            <div key={k.id} className="rounded-md bg-surface-elevated p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{k.full_name || k.doc_type} · {k.doc_number}</div>
                  <div className="text-xs text-muted-foreground">{new Date(k.created_at).toLocaleString(i18n.language)}</div>
                </div>
                <Badge variant="outline" className={
                  k.status === "approved" ? "border-up/40 text-up" :
                  k.status === "rejected" ? "border-down/40 text-down" :
                  "border-warning/40 text-warning"
                }>{t(`profile.kyc.statuses.${k.status}`, { defaultValue: k.status })}</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openViewer(k)}><Eye className="h-4 w-4 mr-1" /> {t("admin.viewDocs")}</Button>
              </div>
              {k.status === "pending" && (
                <div className="space-y-2">
                  <Textarea rows={2} placeholder={t("admin.rejectNotePlaceholder")}
                    value={notes[k.id] ?? ""} onChange={(e) => setNotes({ ...notes, [k.id]: e.target.value })} />
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => review(k.id, true)}>
                      <Check className="h-4 w-4 mr-1" /> {t("common.approve")}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => review(k.id, false)}>
                      <X className="h-4 w-4 mr-1" /> {t("common.reject")}
                    </Button>
                  </div>
                </div>
              )}
              {k.review_notes && k.status !== "pending" && (
                <div className="text-xs text-muted-foreground border-t border-border pt-2">{t("tx.note")}: {k.review_notes}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!viewer} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{t("admin.kycDocuments")}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium">{t("admin.document")}</div>
              {viewer?.doc ? <img src={viewer.doc} className="rounded border border-border w-full" /> : <div className="text-sm text-muted-foreground">—</div>}
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">{t("profile.kyc.bankStatement")}</div>
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
  const { t } = useTranslation();
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
    onSuccess: () => { toast.success(t("admin.noteSaved")); qc.invalidateQueries({ queryKey: ["client-note", userId] }); },
  });

  return (
    <Card title={t("support.internalNote")} action={<Button size="sm" onClick={() => save.mutate()}><Save className="h-4 w-4 mr-1" /> {t("common.save")}</Button>}>
      <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("admin.notePlaceholder")} />
    </Card>
  );
}

/* ---------- Danger ---------- */
function DangerCard({ userId, status, onDone }: { userId: string; status: string; onDone: () => void }) {
  const { t } = useTranslation();
  async function ban() {
    if (!confirm(t("admin.confirmBlockClient"))) return;
    const { error } = await supabase.from("profiles").update({ status: "blocked" }).eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success(t("admin.clientBlocked")); onDone();
  }
  return (
    <div className="rounded-sm border border-down/40 bg-down/5 p-4">
      <div className="text-sm font-semibold text-down">{t("admin.dangerZone")}</div>
      <Button variant="destructive" size="sm" className="mt-2" onClick={ban} disabled={status === "blocked"}>
        <Ban className="h-4 w-4 mr-1" /> {status === "blocked" ? t("admin.alreadyBlocked") : t("admin.blockAccount")}
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
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ["client-wallets", userId],
    queryFn: async () => (await supabase.from("wallets").select("*, currencies(*)").eq("user_id", userId)).data ?? [],
  });
  return (
    <Card title={t("wallets.balance")}>
      {!data?.length ? <Empty text={t("admin.noWallets")} /> : (
        <Table>
          <TableHeader><TableRow><TableHead>{t("common.currency")}</TableHead><TableHead className="text-right">{t("buy.available")}</TableHead><TableHead className="text-right">{t("admin.locked")}</TableHead></TableRow></TableHeader>
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
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["client-deposit-addresses", userId],
    queryFn: async () => (await supabase.from("deposit_addresses" as any).select("*, currencies(symbol,name,network)").eq("user_id", userId).order("created_at", { ascending: false })).data ?? [],
    refetchInterval: 15000,
  });
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <Card title={t("admin.depositAddressRequests")}>
      {!data?.length ? (
        <Empty text={t("admin.noDepositAddressRequests")} />
      ) : (
        <div className="space-y-2">
          {(data as any[]).map((d) => (
            <div key={d.id} className="rounded-md bg-surface-elevated p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{d.currencies?.symbol} · {d.currencies?.name}
                    {d.currencies?.network && <span className="text-xs text-muted-foreground"> · {d.currencies.network}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString(i18n.language)}</div>
                  {d.status === "ready" && <div className="text-xs font-mono break-all mt-1">{d.address}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={d.status === "ready" ? "default" : "secondary"}>{d.status === "ready" ? t("wallet.ready") : t("tx.pending")}</Badge>
                  <Button size="sm" variant="outline" onClick={() => setEditing(d)}>
                    <Upload className="h-4 w-4 mr-1" /> {d.status === "ready" ? t("common.update") : t("common.add")}
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
  const { t } = useTranslation();
  const [address, setAddress] = useState(record.address ?? "");
  const [network, setNetwork] = useState(record.network ?? record.currencies?.network ?? "");
  const [memo, setMemo] = useState(record.memo_tag ?? "");
  const [notes, setNotes] = useState(record.notes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!address) return toast.error(t("admin.enterAddress"));
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
      toast.success(t("admin.addressSent"));
      onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("admin.registerAddress")} · {record.currencies?.symbol}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("wallet.destAddress")}</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x... / bc1..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("admin.network")}</Label><Input value={network} onChange={(e) => setNetwork(e.target.value)} placeholder="ERC20, BEP20..." /></div>
            <div><Label>{t("wallet.memoTag")} ({t("common.optional")})</Label><Input value={memo} onChange={(e) => setMemo(e.target.value)} /></div>
          </div>
          <div>
            <Label className="flex items-center gap-2"><QrCode className="h-4 w-4" /> QR code (PNG/JPG)</Label>
            <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {record.qr_image_path && !file && <p className="text-xs text-muted-foreground mt-1">{t("admin.qrExists")}</p>}
          </div>
          <div><Label>{t("tx.note")} ({t("common.optional")})</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? t("common.saving") : t("admin.saveNotify")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BankAccountsIsland({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ["client-banks", userId],
    queryFn: async () => (await supabase.from("bank_accounts" as any).select("*").eq("user_id", userId)).data as any[] ?? [],
  });
  return (
    <Card title={t("admin.connectedBankAccounts")}>
      <p className="mb-3 text-xs text-muted-foreground">{t("admin.bankSecurityHint")}</p>
      {!data?.length ? <Empty text={t("admin.noBankAccounts")} /> : (
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
  const { t, i18n } = useTranslation();
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
      title={t("admin.transactionHistory")}
      action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> {t("admin.addTransaction")}</Button>}
    >
      <div className="flex gap-1 mb-3 flex-wrap">
        {[
          ["all", t("common.all")], ["pending", t("tx.pending")], ["completed", t("tx.completed")], ["rejected", t("tx.rejected")],
        ].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`text-xs rounded-sm px-3 py-1 border ${filter === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>
      {!filtered.length ? <Empty text={t("admin.noTransactions")} /> : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>{t("common.date")}</TableHead><TableHead>{t("common.type")}</TableHead><TableHead>{t("common.currency")}</TableHead>
            <TableHead className="text-right">{t("common.value")}</TableHead><TableHead className="text-right">USD</TableHead>
            <TableHead>{t("common.status")}</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((tx: any) => (
              <TableRow key={tx.id} className={tx.hidden ? "opacity-50" : ""}>
                <TableCell className="text-xs">{new Date(tx.created_at).toLocaleString(i18n.language)}</TableCell>
                <TableCell>{t(`tx.${tx.type}`, { defaultValue: tx.type })}</TableCell>
                <TableCell>{tx.currencies?.symbol}</TableCell>
                <TableCell className={`text-right tabular-nums ${Number(tx.amount) < 0 ? "text-down" : "text-up"}`}>{Number(tx.amount).toFixed(8)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">${Number(tx.usd_value ?? (Number(tx.currencies?.usd_price ?? 0) * Math.abs(Number(tx.amount)))).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    tx.status === "completed" ? "border-up/40 text-up" :
                    tx.status === "rejected" ? "border-down/40 text-down" :
                    "border-warning/40 text-warning"
                  }>{t(`tx.${(tx.metadata?.ui_status || tx.status)}`, { defaultValue: (tx.metadata?.ui_status || tx.status) })}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => setEditTx(tx)}><Pencil className="h-4 w-4" /></Button>
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
  ["hold", "tx.hold"], ["processing", "tx.processing"], ["approved", "tx.approved"], ["rejected", "tx.rejected"],
];
const TX_TYPES: Array<[string, string]> = [
  ["deposit", "tx.deposit"], ["withdrawal", "tx.withdrawal"], ["adjustment", "tx.adjustment"], ["transfer", "tx.transfer"],
];

function TxDialog({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
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
  const [chargeFee, setChargeFee] = useState(false);
  const [txDate, setTxDate] = useState<string>(() => {
    const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16);
  });
  const [saving, setSaving] = useState(false);

  const currency = currencies?.find((c: any) => c.id === currencyId);
  const usd = currency ? (Number(amount || 0) * Number(currency.usd_price ?? 0)) : 0;

  async function submit() {
    if (!currencyId) return toast.error(t("admin.selectCurrency"));
    if (!amount || Number(amount) <= 0) return toast.error(t("buy.invalidAmount"));
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
      _hidden: false,
      _tx_date: new Date(txDate).toISOString(),
      _fee_waived: !chargeFee,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t("admin.transactionAdded"));
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t("admin.addTransaction")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("common.type")}>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TX_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{t(l)}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label={t("common.currency")}>
              <Select value={currencyId} onValueChange={setCurrencyId}>
                <SelectTrigger><SelectValue placeholder={t("wallet.select")} /></SelectTrigger>
                <SelectContent>{currencies?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.symbol} — {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label={t("admin.transactionDateTime")}>
            <Input type="datetime-local" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
          </Field>
          <Field label={`${t("common.value")}${currency ? ` — ${currency.symbol}` : ""}`}>
            <Input type="number" step="0.00000001" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {currency && amount && (
              <div className="text-xs text-muted-foreground mt-1">≈ ${usd.toFixed(2)} USD ({t("admin.currentQuote")}: ${Number(currency.usd_price ?? 0).toFixed(2)})</div>
            )}
          </Field>
          <Field label={`${t("tx.hash")} — ${t("common.optional")}`}>
            <Input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x..." />
          </Field>
          <Field label={`${t("tx.sender")} — ${t("common.optional")}`}>
            <Input value={sender} onChange={(e) => setSender(e.target.value)} />
          </Field>
          <Field label={t("common.status")}>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TX_STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{t(l)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={t("admin.clientNote")}>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("admin.txNotePlaceholder")} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={hidden} onCheckedChange={setHidden} />
            {t("admin.hideTransaction")}
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? t("common.saving") : t("admin.addTransaction")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TxEditDialog({ tx, onClose, onSaved }: { tx: any; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
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
    toast.success(t("admin.transactionUpdated")); onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("admin.editTransaction")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground font-mono break-all">ID: {tx.id}</div>
          <div className="text-sm">
            <span className="capitalize">{tx.type}</span> · {Number(tx.amount).toFixed(8)} {tx.currencies?.symbol}
          </div>
          <Field label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TX_STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{t(l)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={t("admin.clientNote")}>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={hidden} onCheckedChange={setHidden} />
            {t("admin.hideFromClient")}
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={saving}><Save className="h-4 w-4 mr-1" /> {t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- helpers ---------- */
function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-border bg-surface p-5">
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
  const { t } = useTranslation();
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

  const stables = ["USDT", "USDC", "DAI", "BUSD", "TUSD", "USD"];
  const rows = (wallets ?? []).map((w: any) => {
    const cg = w.currencies?.coingecko_id;
    const sym = (w.currencies?.symbol ?? "").toUpperCase();
    const livePrice = cg ? Number(prices[cg]?.usd) : undefined;
    const dbPrice = Number(w.currencies?.usd_price ?? 0);
    const fallback = dbPrice > 0 ? dbPrice : stables.includes(sym) ? 1 : 0;
    const price = livePrice && livePrice > 0 ? livePrice : fallback;
    const total = Number(w.available) + Number(w.locked);
    return { symbol: w.currencies?.symbol ?? "?", value: total * price, total };
  }).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);

  const totalUsd = rows.reduce((s, r) => s + r.value, 0);
  const chartData = rows.map((r, i) => ({ name: r.symbol, value: r.value, color: KPI_PALETTE[i % KPI_PALETTE.length] }));

  return (
    <section className="rounded-sm border border-border bg-surface p-5 shadow-sm">
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
              <div className="text-[9px] text-muted-foreground">{rows.length} {t("admin.assetsShort")}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile icon={WalletIcon} label={t("admin.portfolio")} value={`$${totalUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`} sub={t("admin.coinsWithBalance", { count: rows.length })} />
          <KpiTile icon={Clock} label={t("admin.pendingTx")} value={pendingTx?.length ?? 0} sub={t("admin.awaitingReview")} accent={pendingTx?.length ? "warning" : undefined} />
          <KpiTile icon={TicketIcon} label={t("admin.openTickets")} value={openTickets?.length ?? 0} sub={t("admin.supportInProgress")} accent={openTickets?.length ? "down" : undefined} />
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
    <div className="rounded-sm border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="mt-2 text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
