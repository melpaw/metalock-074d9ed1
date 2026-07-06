import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ProfileSecurityTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [enrollState, setEnrollState] = useState<null | { factorId: string; qr: string; secret: string }>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [newPass, setNewPass] = useState("");

  const { data: factors } = useQuery({
    queryKey: ["mfa-factors"],
    queryFn: async () => (await supabase.auth.mfa.listFactors()).data,
  });
  const totpFactors = factors?.totp ?? [];
  const verified = totpFactors.find((f) => f.status === "verified");

  async function startEnroll() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `TOTP ${Date.now()}` });
      if (error) throw error;
      setEnrollState({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }
  async function confirmEnroll() {
    if (!enrollState) return;
    setBusy(true);
    try {
      const chal = await supabase.auth.mfa.challenge({ factorId: enrollState.factorId });
      if (chal.error) throw chal.error;
      const ver = await supabase.auth.mfa.verify({ factorId: enrollState.factorId, challengeId: chal.data.id, code });
      if (ver.error) throw ver.error;
      toast.success("2FA " + t("profile.security.twofaActive"));
      setEnrollState(null); setCode("");
      qc.invalidateQueries({ queryKey: ["mfa-factors"] });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }
  async function removeFactor(id: string) {
    if (!confirm("2FA?")) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["mfa-factors"] });
  }
  async function changePass() {
    if (newPass.length < 8) return toast.error("min 8");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("common.success"));
    setNewPass("");
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
        <h3 className="flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4 text-primary" /> {t("profile.security.changePassword")}</h3>
        <div className="space-y-2">
          <Label>{t("profile.security.changePassword")}</Label>
          <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="********" />
        </div>
        <Button onClick={changePass} disabled={busy || newPass.length < 8}>{t("common.save")}</Button>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> {t("profile.security.twofa")}</h3>
          {verified
            ? <Badge className="bg-emerald-500/20 text-emerald-500">{t("profile.security.twofaActive")}</Badge>
            : <Badge className="bg-muted text-muted-foreground"><ShieldOff className="mr-1 h-3 w-3" />{t("profile.security.twofaInactive")}</Badge>}
        </div>
        {verified ? (
          <Button variant="destructive" onClick={() => removeFactor(verified.id)} disabled={busy}>{t("profile.security.remove")}</Button>
        ) : enrollState ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-white p-3 w-fit" dangerouslySetInnerHTML={{ __html: enrollState.qr }} />
            <p className="text-xs text-muted-foreground">Secret: <code className="rounded bg-muted px-1 py-0.5">{enrollState.secret}</code></p>
            <div className="flex gap-2">
              <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" className="max-w-[140px]" />
              <Button onClick={confirmEnroll} disabled={busy || code.length !== 6}>{t("common.confirm")}</Button>
              <Button variant="outline" onClick={() => { setEnrollState(null); setCode(""); }}>{t("common.cancel")}</Button>
            </div>
          </div>
        ) : (
          <Button onClick={startEnroll} disabled={busy}>{t("profile.security.enable")}</Button>
        )}
      </div>
    </div>
  );
}
