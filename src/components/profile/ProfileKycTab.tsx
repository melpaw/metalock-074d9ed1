import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, Clock, ShieldX } from "lucide-react";

const STATUS_META: Record<string, { label: string; icon: any; color: string }> = {
  not_submitted: { label: "—", icon: ShieldAlert, color: "bg-muted text-muted-foreground" },
  pending: { label: "…", icon: Clock, color: "bg-yellow-500/20 text-yellow-500" },
  approved: { label: "✓", icon: ShieldCheck, color: "bg-emerald-500/20 text-emerald-500" },
  rejected: { label: "✕", icon: ShieldX, color: "bg-red-500/20 text-red-500" },
};

export function ProfileKycTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", birth_date: "", doc_type: "CPF", doc_number: "", country: "", address: "" });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: latest } = useQuery({
    queryKey: ["my-kyc"],
    queryFn: async () => (await supabase.from("kyc_submissions").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });

  const status = (latest?.status ?? "not_submitted") as keyof typeof STATUS_META;
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;
  const canSubmit = status === "not_submitted" || status === "rejected";

  async function upload(file: File, kind: string, uid: string) {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${uid}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(path, file);
    if (error) throw error;
    return path;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (!docFile || !selfieFile) throw new Error("Documento + selfie");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão");
      const document_path = await upload(docFile, "document", u.user.id);
      const selfie_path = await upload(selfieFile, "selfie", u.user.id);
      const { error } = await supabase.from("kyc_submissions").insert({
        user_id: u.user.id, ...form, document_path, selfie_path,
      } as any);
      if (error) throw error;
      toast.success("KYC ✓");
      qc.invalidateQueries({ queryKey: ["my-kyc"] });
      setDocFile(null); setSelfieFile(null);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("common.status")}</div>
          <div className="text-lg font-semibold capitalize">{status.replace("_", " ")}</div>
          {latest?.review_notes && <p className="mt-2 text-sm text-muted-foreground">"{latest.review_notes}"</p>}
        </div>
        <Badge className={meta.color}><StatusIcon className="mr-1 h-3 w-3" />{meta.label}</Badge>
      </div>

      {canSubmit && (
        <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-1.5"><Label>Nome completo</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Data de nascimento</Label><Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>País</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Tipo de documento</Label><Input value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Número do documento</Label><Input value={form.doc_number} onChange={(e) => setForm({ ...form, doc_number: e.target.value })} required /></div>
          <div className="md:col-span-2 space-y-1.5"><Label>Endereço</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Foto do documento</Label><Input type="file" accept="image/*,application/pdf" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} required /></div>
          <div className="space-y-1.5"><Label>Selfie com documento</Label><Input type="file" accept="image/*" onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)} required /></div>
          <div className="md:col-span-2"><Button type="submit" disabled={busy}>{busy ? "..." : t("common.send")}</Button></div>
        </form>
      )}
    </div>
  );
}
