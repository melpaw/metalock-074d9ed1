import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Shield, UserPlus, UserCog, ArrowUpCircle, ArrowDownCircle, Users, Ticket as TicketIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

type Role = "admin" | "agent" | "client";

export const Route = createFileRoute("/_authenticated/admin/team")({
  beforeLoad: async () => {
    const { data } = await supabase.from("user_roles").select("role").eq("role", "admin");
    if (!data || data.length === 0) throw (await import("@tanstack/react-router")).redirect({ to: "/admin" });
  },
  component: TeamPage,
});


function TeamPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter] = useState<"all" | Role>("agent");
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [permUser, setPermUser] = useState<any | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["team-users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }, { data: perms }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("agent_permissions").select("*"),
      ]);
      const roleMap = new Map<string, Role>();
      (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));

      // count clients per agent
      const agentIds = (profiles ?? []).filter((p: any) => roleMap.get(p.id) === "agent").map((p: any) => p.id);
      const [{ data: clients }, { data: tickets }] = await Promise.all([
        agentIds.length
          ? supabase.from("profiles").select("registered_by").in("registered_by", agentIds)
          : Promise.resolve({ data: [] as any[] }),
        agentIds.length
          ? supabase.from("support_tickets").select("assigned_to, status").in("assigned_to", agentIds).in("status", ["open", "pending"])
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const clientCount = new Map<string, number>();
      (clients ?? []).forEach((c: any) => {
        if (!c.registered_by) return;
        clientCount.set(c.registered_by, (clientCount.get(c.registered_by) ?? 0) + 1);
      });
      const ticketCount = new Map<string, number>();
      (tickets ?? []).forEach((t: any) => {
        if (!t.assigned_to) return;
        ticketCount.set(t.assigned_to, (ticketCount.get(t.assigned_to) ?? 0) + 1);
      });
      const permMap = new Map<string, any>();
      (perms ?? []).forEach((p: any) => permMap.set(p.agent_id, p));

      return (profiles ?? []).map((p: any) => ({
        ...p,
        role: roleMap.get(p.id) ?? "client",
        clients: clientCount.get(p.id) ?? 0,
        openTickets: ticketCount.get(p.id) ?? 0,
        perms: permMap.get(p.id) ?? null,
      }));
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await supabase.rpc("admin_set_role", { _user_id: userId, _role: role });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["team-users"] }); toast.success(t("admin.roleUpdated")); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return (rows ?? []).filter((u: any) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (u.email ?? "").toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q);
    });
  }, [rows, roleFilter, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("admin.teamPermissions")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin.teamPermissionsHint")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <Button onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4 mr-1" /> {t("admin.addAgent")}</Button>
        </div>

      </div>

      {isLoading && <div className="py-12 text-center text-muted-foreground">{t("common.loading")}</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="rounded-sm border border-border bg-surface p-12 text-center text-muted-foreground">
          {t("admin.noClient", { defaultValue: "Nenhum usuário encontrado." })}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((u: any) => (
          <div key={u.id} className="group rounded-sm border border-border bg-surface p-4 transition hover:border-primary hover:bg-surface-elevated">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-sm gradient-primary font-bold text-primary-foreground">
                {(u.full_name || u.email || "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate font-semibold">{u.full_name || u.email?.split("@")[0]}</div>
                  <UserMenu
                    user={u}
                    onEdit={() => setEditUser(u)}
                    onPermissions={() => setPermUser(u)}
                    onSetRole={(role) => setRole.mutate({ userId: u.id, role })}
                    t={t}
                  />
                </div>
                <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("admin.signupDate")} {new Date(u.created_at).toLocaleDateString(i18n.language)}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <RoleBadge role={u.role} />
              {u.role === "agent" && (
                <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {u.clients}</span>
                  <span className="flex items-center gap-1"><TicketIcon className="h-3 w-3" /> {u.openTickets}</span>
                </span>
              )}
            </div>

            {u.role === "agent" && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <PermChip on={u.perms?.can_add_wallets} label={t("admin.canAddWallets", { defaultValue: "Add wallets" })} />
                <PermChip on={u.perms?.can_approve_kyc} label={t("admin.canApproveKyc", { defaultValue: "KYC" })} />
                <PermChip on={u.perms?.can_process_tx} label={t("admin.canProcessTx", { defaultValue: "Transactions" })} />
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditUser(u)}>
                <UserCog className="mr-1 h-3.5 w-3.5" /> {t("common.edit")}
              </Button>
              {u.role === "agent" && (
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setPermUser(u)}>
                  <Shield className="mr-1 h-3.5 w-3.5" /> {t("admin.permissions")}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AddAgentDialog open={addOpen} onClose={() => setAddOpen(false)} onDone={() => qc.invalidateQueries({ queryKey: ["team-users"] })} />
      {editUser && <EditProfileDialog user={editUser} onClose={() => setEditUser(null)} onDone={() => qc.invalidateQueries({ queryKey: ["team-users"] })} />}
      {permUser && <PermissionsDialog user={permUser} onClose={() => setPermUser(null)} onDone={() => qc.invalidateQueries({ queryKey: ["team-users"] })} />}
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const cls =
    role === "admin" ? "border-primary/40 text-primary bg-primary/10" :
    role === "agent" ? "border-warning/40 text-warning bg-warning/10" :
    "border-border text-muted-foreground";
  return <Badge variant="outline" className={`capitalize ${cls}`}>{role}</Badge>;
}

function PermChip({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border ${on ? "border-up/40 text-up bg-up/10" : "border-border text-muted-foreground"}`}>
      {label}
    </span>
  );
}

function UserMenu({ user, onEdit, onPermissions, onSetRole, t }: { user: any; onEdit: () => void; onPermissions: () => void; onSetRole: (r: Role) => void; t: any }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}><UserCog className="mr-2 h-4 w-4" />{t("common.edit")}</DropdownMenuItem>
        {user.role === "agent" && (
          <DropdownMenuItem onClick={onPermissions}><Shield className="mr-2 h-4 w-4" />{t("admin.permissions")}</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {user.role !== "admin" && (
          <DropdownMenuItem onClick={() => onSetRole("admin")}>
            <ArrowUpCircle className="mr-2 h-4 w-4 text-primary" />{t("admin.promoteAdmin", { defaultValue: "Promover a Admin" })}
          </DropdownMenuItem>
        )}
        {user.role !== "agent" && (
          <DropdownMenuItem onClick={() => onSetRole("agent")}>
            <UserCog className="mr-2 h-4 w-4 text-warning" />{t("admin.setAgent", { defaultValue: "Tornar Agente" })}
          </DropdownMenuItem>
        )}
        {user.role !== "client" && (
          <DropdownMenuItem onClick={() => onSetRole("client")}>
            <ArrowDownCircle className="mr-2 h-4 w-4 text-down" />{t("admin.setClient", { defaultValue: "Rebaixar para Cliente" })}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddAgentDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit() {
    if (!email.trim()) return toast.error(t("admin.enterEmail"));
    setLoading(true);
    try {
      const { data: userId, error } = await supabase.rpc("admin_register_client" as any, { _email: email.trim() });
      if (error) throw error;
      if (!userId) throw new Error(t("admin.userNotFound"));
      const { error: e2 } = await supabase.rpc("admin_set_role", { _user_id: userId, _role: "agent" });
      if (e2) throw e2;
      toast.success(t("admin.agentAdded"));
      setEmail(""); onDone(); onClose();
    } catch (e: any) { toast.error(e.message || String(e)); } finally { setLoading(false); }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("admin.addAgent")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("admin.userEmail")}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("admin.agentEmailPlaceholder")} />
            <p className="mt-1 text-xs text-muted-foreground">{t("admin.addAgentHint")}</p>
          </div>
          <Button onClick={submit} disabled={loading} className="w-full">
            {loading ? t("admin.adding") : t("admin.addAgent")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditProfileDialog({ user, onClose, onDone }: { user: any; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    full_name: user.full_name ?? "",
    date_of_birth: user.date_of_birth ?? "",
    postal_code: user.postal_code ?? "",
    city: user.city ?? "",
    country: user.country ?? "",
    full_address: user.full_address ?? "",
    phone: user.phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.rpc("admin_update_profile" as any, {
        _user_id: user.id,
        _full_name: form.full_name || null,
        _date_of_birth: form.date_of_birth || null,
        _postal_code: form.postal_code || null,
        _city: form.city || null,
        _country: form.country || null,
        _full_address: form.full_address || null,
        _phone: form.phone || null,
      });
      if (error) throw error;
      toast.success(t("common.saved", { defaultValue: "Salvo" }));
      onDone(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t("common.edit")} — {user.email}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("profile.fullName", { defaultValue: "Nome completo" })}>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label={t("profile.phone", { defaultValue: "Telefone" })}>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label={t("profile.dob", { defaultValue: "Data nasc." })}>
            <Input type="date" value={form.date_of_birth ?? ""} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
          </Field>
          <Field label={t("profile.postalCode", { defaultValue: "CEP" })}>
            <Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
          </Field>
          <Field label={t("profile.city", { defaultValue: "Cidade" })}>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label={t("profile.country", { defaultValue: "País" })}>
            <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("profile.address", { defaultValue: "Endereço" })}>
              <Input value={form.full_address} onChange={(e) => setForm({ ...form, full_address: e.target.value })} />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel", { defaultValue: "Cancelar" })}</Button>
          <Button onClick={save} disabled={saving}>{saving ? t("common.saving") : t("common.save", { defaultValue: "Salvar" })}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PermissionsDialog({ user, onClose, onDone }: { user: any; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const [canAddWallets, setCanAddWallets] = useState(false);
  const [canApproveKyc, setCanApproveKyc] = useState(false);
  const [canProcessTx, setCanProcessTx] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("agent_permissions").select("*").eq("agent_id", user.id).maybeSingle();
      const p = (data ?? {}) as any;
      setCanAddWallets(!!p.can_add_wallets);
      setCanApproveKyc(!!p.can_approve_kyc);
      setCanProcessTx(!!p.can_process_tx);
    })();
  }, [user.id]);

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.from("agent_permissions").upsert({
        agent_id: user.id,
        can_add_wallets: canAddWallets,
        can_approve_kyc: canApproveKyc,
        can_process_tx: canProcessTx,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success(t("admin.permissionsUpdated"));
      onDone(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("admin.agentPermissions")} — {user.email}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <PermRow
            label={t("admin.canAddWallets", { defaultValue: "Criar carteiras" })}
            hint={t("admin.canAddWalletsHint", { defaultValue: "Permite ao agente adicionar endereços de depósito" })}
            checked={canAddWallets}
            onChange={setCanAddWallets}
          />
          <PermRow
            label={t("admin.canApproveKyc", { defaultValue: "Aprovar KYC" })}
            hint={t("admin.canApproveKycHint", { defaultValue: "Permite aprovar/recusar KYC dos clientes" })}
            checked={canApproveKyc}
            onChange={setCanApproveKyc}
          />
          <PermRow
            label={t("admin.canProcessTx", { defaultValue: "Processar transações" })}
            hint={t("admin.canProcessTxHint", { defaultValue: "Permite aprovar/rejeitar depósitos e saques" })}
            checked={canProcessTx}
            onChange={setCanProcessTx}
          />
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? t("common.saving") : t("admin.savePermissions")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PermRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-sm border border-border bg-surface-elevated p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
