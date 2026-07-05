import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Save, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/deposits")({
  component: DepositsPage,
});

function DepositsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-deposit-addresses"],
    queryFn: async () => (await supabase
      .from("deposit_addresses" as any)
      .select("*, currencies(symbol,name,network), profiles!deposit_addresses_user_id_fkey(email,full_name)")
      .order("status", { ascending: true }).order("created_at", { ascending: false })).data ?? [],
    refetchInterval: 20000,
  });

  const [editing, setEditing] = useState<any | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Endereços de depósito</h1>
        <p className="text-sm text-muted-foreground">
          Os clientes solicitam endereços por moeda. Cadastre o endereço e envie o QR code.
        </p>
      </div>

      {isLoading && <div className="text-center text-muted-foreground py-12">Carregando...</div>}

      <div className="grid gap-3 lg:grid-cols-2">
        {(data as any[]).map((d) => (
          <div key={d.id} className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{d.profiles?.full_name || d.profiles?.email}</div>
                <div className="text-xs text-muted-foreground">{d.profiles?.email}</div>
              </div>
              <Badge variant={d.status === "ready" ? "default" : "secondary"}>{d.status === "ready" ? "Pronto" : "Pendente"}</Badge>
            </div>
            <div className="text-sm">
              <span className="font-mono font-bold">{d.currencies?.symbol}</span> · {d.currencies?.name}
              {d.currencies?.network && <span className="text-xs text-muted-foreground"> · {d.currencies.network}</span>}
            </div>
            {d.status === "ready" ? (
              <div className="text-xs text-muted-foreground font-mono break-all">{d.address}</div>
            ) : (
              <div className="text-xs text-warning">Aguardando cadastro pelo admin.</div>
            )}
            <div className="pt-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(d)}>
                <Upload className="h-4 w-4 mr-1" /> {d.status === "ready" ? "Atualizar" : "Cadastrar endereço"}
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && !data?.length && (
          <div className="col-span-full rounded-xl border border-border bg-surface p-12 text-center text-muted-foreground">
            Nenhum pedido de endereço.
          </div>
        )}
      </div>

      {editing && (
        <EditDialog record={editing} onClose={() => setEditing(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ["admin-deposit-addresses"] }); setEditing(null); }} />
      )}
    </div>
  );
}

function EditDialog({ record, onClose, onSaved }: { record: any; onClose: () => void; onSaved: () => void }) {
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
            <Label className="flex items-center gap-2"><QrCode className="h-4 w-4" /> QR code (imagem PNG/JPG)</Label>
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
