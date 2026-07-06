import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CryptoIcon } from "@/components/CryptoIcon";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Wallet, Info } from "lucide-react";
import { toast } from "sonner";

type Tab = "all" | "pending" | "completed" | "rejected" | "cancelled";
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Pendentes" },
  { key: "completed", label: "Aprovadas" },
  { key: "rejected", label: "Rejeitadas" },
  { key: "cancelled", label: "Canceladas" },
];

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  completed: "bg-up/15 text-up border-up/30",
  rejected: "bg-down/15 text-down border-down/30",
  cancelled: "bg-muted/40 text-muted-foreground border-border",
};

export function TransactionsQueue() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [detail, setDetail] = useState<any | null>(null);

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
      toast.success("Ação registrada");
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
      toast.success("Depósito processado");
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
      toast.success("Saque processado");
      qc.invalidateQueries({ queryKey: ["staff-transactions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-sm border px-3 py-1.5 text-xs font-medium transition ${
              tab === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-sm border border-border bg-surface overflow-hidden">
        {!rows || rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Nenhuma transação.</div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r: any) => (
              <TxRow key={r.id} r={r} onDetail={() => setDetail(r)}
                onApprove={() => act(r, true)} onReject={() => act(r, false)} />
            ))}
          </div>
        )}
      </div>

      <DetailDialog tx={detail} onClose={() => setDetail(null)} />
    </div>
  );

  function act(r: any, approve: boolean) {
    if (r.type === "swap") approveSwap.mutate({ id: r.id, approve });
    else if (r.type === "deposit") processDeposit.mutate({ id: r.id, approve });
    else if (r.type === "withdrawal") processWithdrawal.mutate({ id: r.id, approve });
    else toast.error("Tipo de transação sem ação disponível");
  }
}

function TxRow({ r, onDetail, onApprove, onReject }: any) {
  const amt = Math.abs(Number(r.amount));
  const sym = r.currencies?.symbol ?? "?";
  const canAct = r.status === "pending" && ["swap", "deposit", "withdrawal"].includes(r.type);
  return (
    <div className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-4 px-5 py-4">
      <TypeIcon type={r.type} />
      <CryptoIcon id={r.currencies?.coingecko_id} symbol={sym} className="h-8 w-8" />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{r.profile?.full_name || r.profile?.email?.split("@")[0] || "—"}</div>
        <div className="truncate text-[11px] text-muted-foreground">{r.profile?.email} · {typeLabel(r.type)}</div>
      </div>
      <div className="text-right">
        <div className="font-bold tabular-nums text-up">{amt.toFixed(8)} {sym}</div>
        <div className="text-[10px] text-muted-foreground tabular-nums">${Number(r.usd_value ?? 0).toFixed(2)}</div>
      </div>
      <Badge className={`rounded-sm border ${STATUS_COLOR[r.status] ?? STATUS_COLOR.pending}`} variant="outline">
        {r.status}
      </Badge>
      <div className="text-right text-[11px] text-muted-foreground tabular-nums">
        {new Date(r.created_at).toLocaleDateString()}
        <div>{new Date(r.created_at).toLocaleTimeString()}</div>
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={onDetail}><Info className="h-3.5 w-3.5" /></Button>
        {canAct && (
          <>
            <Button size="sm" onClick={onApprove}>Aprovar</Button>
            <Button size="sm" variant="outline" onClick={onReject}>Rejeitar</Button>
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

function typeLabel(t: string) {
  return ({ deposit: "Depósito", withdrawal: "Saque", swap: "Compra/Swap", investment: "Investimento", adjustment: "Ajuste" } as any)[t] ?? t;
}

function DetailDialog({ tx, onClose }: { tx: any | null; onClose: () => void }) {
  if (!tx) return null;
  const md = tx.metadata ?? {};
  const rows: Array<[string, string]> = ([
    ["Cliente", tx.profile?.full_name || tx.profile?.email],
    ["Email", tx.profile?.email],
    ["Tipo", typeLabel(tx.type)],
    ["Status", tx.status],
    ["Moeda", tx.currencies?.name],
    ["Valor", `${Number(tx.amount).toFixed(8)} ${tx.currencies?.symbol ?? ""}`],
    ["USD", `$${Number(tx.usd_value ?? 0).toFixed(2)}`],
    ["Data", new Date(tx.created_at).toLocaleString()],
    ["Hash", md.tx_hash],
    ["Endereço remetente", md.sender_address],
    ["Endereço destino", md.address],
    ["Nota", tx.note],
    ["Referência", tx.reference],
    ["Metadata", JSON.stringify(md)],
  ] as Array<[string, any]>).filter(([, v]) => v).map(([k, v]) => [k, String(v)] as [string, string]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Detalhes da transação</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[10rem_minmax(0,1fr)] gap-3 rounded-sm border border-border px-3 py-2 text-sm">
              <span className="text-muted-foreground">{k}</span>
              <span className="min-w-0 break-words font-medium">{String(v)}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
