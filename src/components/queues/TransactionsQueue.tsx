import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CryptoIcon } from "@/components/CryptoIcon";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Wallet, Info, ShieldCheck, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type Tab = "all" | "pending" | "completed" | "rejected" | "cancelled";
const TABS: { key: Tab; labelKey: string }[] = [
  { key: "all", labelKey: "common.all" },
  { key: "pending", labelKey: "tx.pending" },
  { key: "completed", labelKey: "tx.completed" },
  { key: "rejected", labelKey: "tx.rejected" },
  { key: "cancelled", labelKey: "tx.cancelled" },
];

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  completed: "bg-up/15 text-up border-up/30",
  rejected: "bg-down/15 text-down border-down/30",
  cancelled: "bg-muted/40 text-muted-foreground border-border",
};

export function TransactionsQueue() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [detail, setDetail] = useState<any | null>(null);
  const [insTx, setInsTx] = useState<any | null>(null);
  const [insPct, setInsPct] = useState("");

  const { data: rows } = useQuery({
    queryKey: ["staff-transactions", tab],
    queryFn: async () => {
      let q = supabase
        .from("transactions")
        .select("*, currencies(symbol,name,coingecko_id)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (tab !== "all") q = q.eq("status", tab);
      const { data } = await q;
      const uids = Array.from(new Set((data ?? []).map((r: any) => r.user_id)));
      const { data: profs } = uids.length
        ? await supabase.from("profiles").select("id,email,full_name").in("id", uids)
        : { data: [] };
      const pm = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (data ?? []).map((r: any) => ({ ...r, profile: pm.get(r.user_id) }));
    },
    refetchInterval: 15000,
  });

  const approveSwap = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase.rpc("staff_process_swap", { _tx_id: id, _approve: approve });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("admin.actionRecorded"));
      qc.invalidateQueries({ queryKey: ["staff-transactions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const processDeposit = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase.rpc("admin_process_deposit", { _tx_id: id, _approve: approve });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("admin.depositProcessed"));
      qc.invalidateQueries({ queryKey: ["staff-transactions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const processWithdrawal = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase.rpc("admin_process_withdrawal", { _tx_id: id, _approve: approve });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("admin.withdrawalProcessed"));
      qc.invalidateQueries({ queryKey: ["staff-transactions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setInsurance = useMutation({
    mutationFn: async ({ id, percent }: { id: string; percent: number }) => {
      const { error } = await supabase.rpc("admin_set_insurance_quote" as any, { _tx_id: id, _percent: percent });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("admin.quoteSaved"));
      setInsTx(null); setInsPct("");
      qc.invalidateQueries({ queryKey: ["staff-transactions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`rounded-sm border px-3 py-1.5 text-xs font-medium transition ${
              tab === tabItem.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {t(tabItem.labelKey)}
          </button>
        ))}
      </div>

      <div className="rounded-sm border border-border bg-surface overflow-hidden">
        {!rows || rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">{t("admin.noTransactions")}</div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r: any) => (
              <TxRow key={r.id} r={r} t={t} language={i18n.language} onDetail={() => setDetail(r)}
                onApprove={() => act(r, true)} onReject={() => act(r, false)}
                onQuoteInsurance={() => { setInsTx(r); setInsPct(String(r.metadata?.insurance_percent ?? "")); }} />
            ))}
          </div>
        )}
      </div>

      <DetailDialog tx={detail} onClose={() => setDetail(null)} />

      {insTx && (
        <Dialog open onOpenChange={(o) => !o && setInsTx(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>{t("admin.quoteInsuranceTitle")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                {insTx.profile?.email} · ${Number(insTx.usd_value ?? 0).toFixed(2)}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t("admin.percentLabel")}</label>
                <Input type="number" min="0" max="100" step="0.01" value={insPct} onChange={(e) => setInsPct(e.target.value)} />
              </div>
              <Button
                onClick={() => setInsurance.mutate({ id: insTx.id, percent: Number(insPct) })}
                disabled={setInsurance.isPending || !insPct}
                className="w-full"
              >
                {t("admin.saveQuote")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

  function act(r: any, approve: boolean) {
    if (r.type === "swap") approveSwap.mutate({ id: r.id, approve });
    else if (r.type === "deposit") processDeposit.mutate({ id: r.id, approve });
    else if (r.type === "withdrawal") processWithdrawal.mutate({ id: r.id, approve });
    else toast.error(t("admin.transactionNoAction"));
  }
}

function TxRow({ r, t, language, onDetail, onApprove, onReject, onQuoteInsurance }: any) {
  const amt = Math.abs(Number(r.amount));
  const sym = r.currencies?.symbol ?? "?";
  const canAct = r.status === "pending" && ["swap", "deposit", "withdrawal"].includes(r.type);
  const needsQuote = r.type === "withdrawal" && r.metadata?.insurance_requested && !r.metadata?.insurance_percent;
  return (
    <div className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-4 px-5 py-4">
      <TypeIcon type={r.type} />
      <CryptoIcon id={r.currencies?.coingecko_id} symbol={sym} className="h-8 w-8" />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{r.profile?.full_name || r.profile?.email?.split("@")[0] || "—"}</div>
        <div className="truncate text-[11px] text-muted-foreground">{r.profile?.email} · {typeLabel(r.type, t)}</div>
      </div>
      <div className="text-right">
        <div className="font-bold tabular-nums text-up">{amt.toFixed(8)} {sym}</div>
        <div className="text-[10px] text-muted-foreground tabular-nums">${Number(r.usd_value ?? 0).toFixed(2)}</div>
      </div>
      <Badge className={`rounded-sm border ${STATUS_COLOR[r.status] ?? STATUS_COLOR.pending}`} variant="outline">
        {t(`tx.${r.status}`, { defaultValue: r.status })}
      </Badge>
      <div className="text-right text-[11px] text-muted-foreground tabular-nums">
        {new Date(r.created_at).toLocaleDateString(language)}
        <div>{new Date(r.created_at).toLocaleTimeString(language)}</div>
      </div>
      <div className="flex flex-wrap justify-end gap-1">
        <Button size="sm" variant="outline" onClick={onDetail}><Info className="h-3.5 w-3.5" /></Button>
        {needsQuote && (
          <Button size="sm" variant="outline" onClick={onQuoteInsurance} className="border-warning/40 text-warning">
            <ShieldCheck className="h-3.5 w-3.5 mr-1" />{t("admin.quoteInsurance")}
          </Button>
        )}
        {canAct && (
          <>
            <Button size="sm" onClick={onApprove}>{t("common.approve")}</Button>
            <Button size="sm" variant="outline" onClick={onReject}>{t("common.reject")}</Button>
          </>
        )}
      </div>
    </div>
  );
}

function TypeIcon({ type }: { type: string }) {
  const map: Record<string, { icon: any; color: string; bg: string }> = {
    deposit: { icon: ArrowDownLeft, color: "text-up", bg: "bg-up/10" },
    withdrawal: { icon: ArrowUpRight, color: "text-down", bg: "bg-down/10" },
    swap: { icon: ArrowLeftRight, color: "text-primary", bg: "bg-primary/10" },
    investment: { icon: Wallet, color: "text-accent-foreground", bg: "bg-accent" },
    adjustment: { icon: Wallet, color: "text-muted-foreground", bg: "bg-muted/40" },
  };
  const cfg = map[type] ?? map.adjustment;
  const Icon = cfg.icon;
  return (
    <div className={`grid h-8 w-8 place-items-center rounded-sm ${cfg.bg}`}>
      <Icon className={`h-4 w-4 ${cfg.color}`} />
    </div>
  );
}

function typeLabel(type: string, t: (key: string, opts?: any) => string) {
  return type === "swap" ? t("tx.buySwap") : t(`tx.${type}`, { defaultValue: type });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="shrink-0 rounded-sm border border-border p-1.5 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
      aria-label="Copy"
    >
      {copied ? <Check className="h-3 w-3 text-up" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function Field({ label, value, mono, copy }: { label: string; value: React.ReactNode; mono?: boolean; copy?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 border-b border-border/60 py-2 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`mt-0.5 min-w-0 break-all text-sm font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
      </div>
      {copy && <CopyButton value={copy} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-border bg-surface/40">
      <div className="border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

function DetailDialog({ tx, onClose }: { tx: any | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  if (!tx) return null;
  const md = tx.metadata ?? {};
  const sym = tx.currencies?.symbol ?? "";
  const amt = Math.abs(Number(tx.amount));
  const usd = Number(tx.usd_value ?? 0);
  const knownMdKeys = new Set(["tx_hash", "sender_address", "address", "insurance_percent", "insurance_requested"]);
  const extraMd = Object.entries(md).filter(([k, v]) => !knownMdKeys.has(k) && v !== null && v !== undefined && v !== "");
  const showReference = tx.reference && tx.reference !== md.tx_hash;
  const hasBlockchain = md.tx_hash || md.sender_address || md.address;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <TypeIcon type={tx.type} />
            <div className="flex flex-col">
              <span>{t("tx.detailsTitle")}</span>
              <span className="text-xs font-normal text-muted-foreground">{typeLabel(tx.type, t)} · {sym}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 rounded-sm border border-border bg-surface p-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("common.amount")}</div>
              <div className="text-xl font-bold tabular-nums">{amt.toFixed(8)} <span className="text-sm text-muted-foreground">{sym}</span></div>
              <div className="text-xs text-muted-foreground tabular-nums">${usd.toFixed(2)} USD</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("tx.status")}</div>
              <Badge className={`mt-1 rounded-sm border ${STATUS_COLOR[tx.status] ?? STATUS_COLOR.pending}`} variant="outline">
                {t(`tx.${tx.status}`, { defaultValue: tx.status })}
              </Badge>
              <div className="mt-1 text-[11px] text-muted-foreground">{new Date(tx.created_at).toLocaleString(i18n.language)}</div>
            </div>
          </div>

          {/* Client */}
          <Section title={t("support.client")}>
            <Field label={t("profile.info.fullName")} value={tx.profile?.full_name || "—"} />
            <Field label={t("auth.email")} value={tx.profile?.email || "—"} copy={tx.profile?.email} />
          </Section>

          {/* Transaction */}
          <Section title={t("tx.detailsTitle")}>
            <Field label={t("common.currency")} value={`${tx.currencies?.name ?? "—"} (${sym})`} />
            <Field label={t("tx.type")} value={typeLabel(tx.type, t)} />
            {showReference && <Field label={t("tx.reference")} value={tx.reference} mono copy={tx.reference} />}
          </Section>

          {/* Blockchain */}
          {hasBlockchain && (
            <Section title="Blockchain">
              {md.tx_hash && <Field label={t("tx.hash")} value={md.tx_hash} mono copy={md.tx_hash} />}
              {md.sender_address && <Field label={t("tx.sender")} value={md.sender_address} mono copy={md.sender_address} />}
              {md.address && <Field label={t("tx.destination")} value={md.address} mono copy={md.address} />}
            </Section>
          )}

          {/* Insurance */}
          {(md.insurance_requested || md.insurance_percent) && (
            <Section title={t("admin.quoteInsurance")}>
              {md.insurance_percent && <Field label={t("admin.percentLabel")} value={`${md.insurance_percent}%`} />}
              {md.insurance_requested && !md.insurance_percent && <Field label={t("common.status")} value={t("common.pending", { defaultValue: "Pending" })} />}
            </Section>
          )}

          {/* Note */}
          {tx.note && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-4 text-center">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
                {t("tx.note")}
              </div>
              <div className="text-sm font-medium whitespace-pre-wrap break-words text-foreground">
                {tx.note}
              </div>
            </div>
          )}

          {/* Extra metadata */}
          {extraMd.length > 0 && (
            <Section title="Metadata">
              {extraMd.map(([k, v]) => (
                <Field key={k} label={k} value={typeof v === "object" ? JSON.stringify(v) : String(v)} mono />
              ))}
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

