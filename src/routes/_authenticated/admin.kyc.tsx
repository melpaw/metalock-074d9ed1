import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Eye, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/kyc")({
  head: () => ({ meta: [{ title: "KYC — Admin" }] }),
  component: AdminKycPage,
});

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-500",
  approved: "bg-emerald-500/20 text-emerald-500",
  rejected: "bg-red-500/20 text-red-500",
};

function AdminKycPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const { data: submissions = [] } = useQuery({
    queryKey: ["admin-kyc", filter],
    queryFn: async () => {
      let q = supabase.from("kyc_submissions").select("*, profiles(email, full_name)").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  async function signedUrl(path: string | null) {
    if (!path) return null;
    const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 300);
    return data?.signedUrl ?? null;
  }

  async function review(id: string, approve: boolean, notes: string) {
    const { error } = await supabase.rpc("admin_review_kyc", { _id: id, _approve: approve, _notes: notes });
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "KYC aprovado" : "KYC recusado");
    qc.invalidateQueries({ queryKey: ["admin-kyc"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Verificações (KYC)</h1>
          <p className="text-sm text-muted-foreground">Análise dos documentos enviados pelos clientes.</p>
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-surface p-1">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded ${filter === f ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {f === "pending" ? "Pendentes" : f === "approved" ? "Aprovados" : f === "rejected" ? "Recusados" : "Todos"}
            </button>
          ))}
        </div>
      </div>

      {submissions.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nada por aqui.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {submissions.map((s: any) => (
            <KycRow key={s.id} sub={s} onReview={review} signedUrl={signedUrl} />
          ))}
        </div>
      )}
    </div>
  );
}

function KycRow({ sub, onReview, signedUrl }: { sub: any; onReview: (id: string, ok: boolean, notes: string) => void; signedUrl: (p: string | null) => Promise<string | null> }) {
  const [notes, setNotes] = useState("");
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [selfUrl, setSelfUrl] = useState<string | null>(null);

  async function loadUrls() {
    setDocUrl(await signedUrl(sub.document_path));
    setSelfUrl(await signedUrl(sub.selfie_path));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{sub.full_name}</CardTitle>
          <p className="text-xs text-muted-foreground">{sub.profiles?.email ?? "—"} · {format(new Date(sub.created_at), "dd/MM/yyyy HH:mm")}</p>
        </div>
        <Badge className={STATUS_COLOR[sub.status] ?? "bg-muted"}>{sub.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Documento</div>{sub.doc_type} — {sub.doc_number}</div>
          <div><div className="text-xs text-muted-foreground">Nascimento</div>{format(new Date(sub.birth_date), "dd/MM/yyyy")}</div>
          <div><div className="text-xs text-muted-foreground">País</div>{sub.country}</div>
          <div className="md:col-span-1 col-span-2"><div className="text-xs text-muted-foreground">Endereço</div>{sub.address}</div>
        </div>

        <Dialog onOpenChange={(o) => o && loadUrls()}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Eye className="mr-1 h-4 w-4" /> Ver documentos</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Documentos de {sub.full_name}</DialogTitle></DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div><div className="mb-2 text-sm font-medium">Documento</div>
                {docUrl ? <img src={docUrl} alt="doc" className="rounded border border-border w-full" /> : <div className="text-sm text-muted-foreground">Carregando…</div>}
              </div>
              <div><div className="mb-2 text-sm font-medium">Selfie</div>
                {selfUrl ? <img src={selfUrl} alt="selfie" className="rounded border border-border w-full" /> : <div className="text-sm text-muted-foreground">Carregando…</div>}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {sub.status === "pending" && (
          <div className="space-y-2 border-t border-border pt-3">
            <Textarea placeholder="Observações (opcional para aprovar, obrigatório para recusar)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onReview(sub.id, true, notes)} className="bg-emerald-600 hover:bg-emerald-500">
                <Check className="mr-1 h-4 w-4" /> Aprovar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => {
                if (!notes.trim()) { toast.error("Informe o motivo da recusa"); return; }
                onReview(sub.id, false, notes);
              }}>
                <X className="mr-1 h-4 w-4" /> Recusar
              </Button>
            </div>
          </div>
        )}

        {sub.review_notes && sub.status !== "pending" && (
          <div className="rounded border border-border bg-surface p-2 text-xs text-muted-foreground">
            <strong className="text-foreground">Nota:</strong> {sub.review_notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
