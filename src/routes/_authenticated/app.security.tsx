import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/security")({
  head: () => ({ meta: [{ title: "Segurança — CryptoVault" }] }),
  component: SecurityPage,
});

function SecurityPage() {
  const qc = useQueryClient();
  const [enrollState, setEnrollState] = useState<null | { factorId: string; qr: string; secret: string }>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: factors } = useQuery({
    queryKey: ["mfa-factors"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    },
  });

  const totpFactors = factors?.totp ?? [];
  const verified = totpFactors.find((f) => f.status === "verified");

  async function startEnroll() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `TOTP ${Date.now()}` });
      if (error) throw error;
      setEnrollState({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar 2FA");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll() {
    if (!enrollState) return;
    setBusy(true);
    try {
      const chal = await supabase.auth.mfa.challenge({ factorId: enrollState.factorId });
      if (chal.error) throw chal.error;
      const ver = await supabase.auth.mfa.verify({
        factorId: enrollState.factorId,
        challengeId: chal.data.id,
        code,
      });
      if (ver.error) throw ver.error;
      toast.success("2FA ativado com sucesso!");
      setEnrollState(null); setCode("");
      qc.invalidateQueries({ queryKey: ["mfa-factors"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Código inválido");
    } finally {
      setBusy(false);
    }
  }

  async function removeFactor(id: string) {
    if (!confirm("Remover 2FA da conta?")) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (error) throw error;
      toast.success("2FA removido.");
      qc.invalidateQueries({ queryKey: ["mfa-factors"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Segurança</h1>
        <p className="text-sm text-muted-foreground">Ative a autenticação em dois fatores (2FA) para proteger sua conta.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" /> Autenticação em 2 fatores (TOTP)
          </CardTitle>
          {verified ? (
            <Badge className="bg-emerald-500/20 text-emerald-500"><ShieldCheck className="mr-1 h-3 w-3" /> Ativo</Badge>
          ) : (
            <Badge className="bg-muted text-muted-foreground"><ShieldOff className="mr-1 h-3 w-3" /> Inativo</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {verified ? (
            <>
              <p className="text-sm text-muted-foreground">
                A partir do próximo login será solicitado um código do seu app autenticador (Google Authenticator, Authy, 1Password…).
              </p>
              <Button variant="destructive" onClick={() => removeFactor(verified.id)} disabled={busy}>
                Remover 2FA
              </Button>
            </>
          ) : enrollState ? (
            <div className="space-y-4">
              <p className="text-sm">1. Escaneie o QR code com seu app autenticador:</p>
              <div className="rounded-lg bg-white p-4 w-fit" dangerouslySetInnerHTML={{ __html: enrollState.qr }} />
              <p className="text-xs text-muted-foreground">
                Ou copie o segredo: <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">{enrollState.secret}</code>
              </p>
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="code">2. Digite o código de 6 dígitos</Label>
                <Input id="code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" />
              </div>
              <div className="flex gap-2">
                <Button onClick={confirmEnroll} disabled={busy || code.length !== 6}>Confirmar</Button>
                <Button variant="outline" onClick={() => { setEnrollState(null); setCode(""); }}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <Button onClick={startEnroll} disabled={busy} className="font-semibold">Ativar 2FA</Button>
          )}
          {totpFactors.filter(f => f.status !== "verified").length > 0 && !enrollState && (
            <p className="text-xs text-muted-foreground">
              Há fatores pendentes na sua conta.{" "}
              <button onClick={() => totpFactors.filter(f => f.status !== "verified").forEach(f => removeFactor(f.id))} className="text-primary underline">
                Limpar
              </button>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
