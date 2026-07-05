import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Redefinir senha — CryptoVault" }, { name: "robots", content: "noindex" }] }),
  component: ResetPasswordPage,
});

const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter no mínimo 8 caracteres")
  .regex(/[0-9]/, "A senha precisa ter pelo menos 1 número");

function PasswordInput({
  id, value, onChange, autoComplete,
}: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={8}
        autoComplete={autoComplete}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery link automatically. Wait for the PASSWORD_RECOVERY event
    // or an already-hydrated session, then let the user set a new password.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setValidSession(true);
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidSession(true);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Senha inválida");
    if (password !== passwordConfirm) return toast.error("As senhas não coincidem");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Senha atualizada com sucesso!");
      setTimeout(() => navigate({ to: "/dashboard" }), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md gradient-primary font-black text-primary-foreground">C</div>
          <span className="text-lg font-bold">CryptoVault</span>
        </Link>

        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
          {!ready ? (
            <p className="text-center text-sm text-muted-foreground">Validando link...</p>
          ) : done ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="mx-auto h-10 w-10 text-up" />
              <h1 className="text-xl font-bold">Senha atualizada!</h1>
              <p className="text-sm text-muted-foreground">Redirecionando para seu painel...</p>
            </div>
          ) : !validSession ? (
            <div className="text-center space-y-3">
              <AlertCircle className="mx-auto h-10 w-10 text-down" />
              <h1 className="text-xl font-bold">Link inválido ou expirado</h1>
              <p className="text-sm text-muted-foreground">
                O link de redefinição vale por 1 hora. Solicite um novo para continuar.
              </p>
              <Button asChild className="w-full mt-2">
                <Link to="/auth" search={{ mode: "forgot" }}>Solicitar novo link</Link>
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold">Definir nova senha</h1>
              <p className="mt-2 text-sm text-muted-foreground">Escolha uma senha forte que você vai lembrar.</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" />
                  <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, incluindo pelo menos 1 número.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm">Confirmar nova senha</Label>
                  <PasswordInput id="passwordConfirm" value={passwordConfirm} onChange={setPasswordConfirm} autoComplete="new-password" />
                </div>
                <Button type="submit" className="w-full font-semibold" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
