import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, Clock, ShieldX } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/kyc")({
  head: () => ({ meta: [{ title: "Verificação (KYC) — CryptoVault" }] }),
  component: KycPage,
});

const schema = z.object({
  full_name: z.string().trim().min(3, "Nome muito curto").max(120),
  birth_date: z.string().min(10, "Data inválida"),
  doc_type: z.string().min(2).max(30),
  doc_number: z.string().trim().min(4).max(40),
  country: z.string().trim().min(2).max(60),
  address: z.string().trim().min(6).max(300),
});

const STATUS_META = {
  not_submitted: { label: "Não enviado", icon: ShieldAlert, color: "bg-muted text-muted-foreground" },
  pending: { label: "Em análise", icon: Clock, color: "bg-yellow-500/20 text-yellow-500" },
  approved: { label: "Aprovado", icon: ShieldCheck, color: "bg-emerald-500/20 text-emerald-500" },
  rejected: { label: "Recusado", icon: ShieldX, color: "bg-red-500/20 text-red-500" },
} as const;

function KycPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    full_name: "", birth_date: "", doc_type: "CPF", doc_number: "",
    country: "Brasil", address: "",
  });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: latest } = useQuery({
    queryKey: ["my-kyc"],
    queryFn: async () => {
      const { data } = await supabase
        .from("kyc_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const status = (latest?.status ?? "not_submitted") as keyof typeof STATUS_META;
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;
  const canSubmit = status === "not_submitted" || status === "rejected";

  async function upload(file: File, kind: "document" | "selfie", userId: string) {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${userId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: false });
    if (error) throw error;
    return path;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      if (!docFile || !selfieFile) throw new Error("Envie o documento e a selfie");
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Sessão expirada");
      const document_path = await upload(docFile, "document", uid);
      const selfie_path = await upload(selfieFile, "selfie", uid);
      const { error } = await supabase.from("kyc_submissions").insert({
        user_id: uid,
        ...parsed.data,
        document_path,
        selfie_path,
      });
      if (error) throw error;
      toast.success("KYC enviado! Aguarde a análise.");
      qc.invalidateQueries({ queryKey: ["my-kyc"] });
      setDocFile(null); setSelfieFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Verificação de identidade (KYC)</h1>
        <p className="text-sm text-muted-foreground">Necessária para saques e limites elevados.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Status atual</CardTitle>
          <Badge className={meta.color}><StatusIcon className="mr-1 h-3 w-3" />{meta.label}</Badge>
        </CardHeader>
        {latest?.review_notes && (
          <CardContent className="text-sm text-muted-foreground">
            <strong className="text-foreground">Observação do revisor:</strong> {latest.review_notes}
          </CardContent>
        )}
      </Card>

      {canSubmit && (
        <Card>
          <CardHeader><CardTitle className="text-base">{status === "rejected" ? "Reenviar documentos" : "Enviar documentos"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="full_name">Nome completo</Label>
                <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de nascimento</Label>
                <Input id="birth_date" type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input id="country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc_type">Tipo de documento</Label>
                <Input id="doc_type" value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc_number">Número do documento</Label>
                <Input id="doc_number" value={form.doc_number} onChange={(e) => setForm({ ...form, doc_number: e.target.value })} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Endereço completo</Label>
                <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc_file">Foto do documento</Label>
                <Input id="doc_file" type="file" accept="image/*,application/pdf" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="selfie_file">Selfie segurando o documento</Label>
                <Input id="selfie_file" type="file" accept="image/*" onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)} required />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={loading} className="font-semibold">
                  {loading ? "Enviando..." : "Enviar para análise"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
