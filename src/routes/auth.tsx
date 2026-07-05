import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["login", "signup", "forgot"]).optional().default("login"),
});


export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Entrar — CryptoVault" }, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

const signupPasswordSchema = z
  .string()
  .min(8, "A senha precisa ter no mínimo 8 caracteres")
  .regex(/[0-9]/, "A senha precisa ter pelo menos 1 número");

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={minLength}
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

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const parsed = signupPasswordSchema.safeParse(password);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? "Senha inválida");
          setLoading(false);
          return;
        }
        if (password !== passwordConfirm) {
          toast.error("As senhas não coincidem");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Redirecionando...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 gradient-surface border-r border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md gradient-primary font-black text-primary-foreground">C</div>
          <span className="text-lg font-bold">CryptoVault</span>
        </Link>
        <div>
          <h2 className="text-4xl font-bold tracking-tight">Investir em cripto <span className="text-primary">nunca foi</span> tão simples.</h2>
          <p className="mt-4 text-muted-foreground max-w-md">
            Junte-se a milhares de investidores em uma plataforma segura, transparente e projetada para profissionais.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} CryptoVault</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-md gradient-primary font-black text-primary-foreground">C</div>
              <span className="text-lg font-bold">CryptoVault</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold">{isSignup ? "Criar sua conta" : "Entrar na sua conta"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignup ? "É rápido e gratuito." : "Bom te ver de novo."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={setPassword}
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={isSignup ? 8 : 6}
              />
              {isSignup && (
                <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, incluindo pelo menos 1 número.</p>
              )}
            </div>
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Confirmar senha</Label>
                <PasswordInput
                  id="passwordConfirm"
                  value={passwordConfirm}
                  onChange={setPasswordConfirm}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
            )}
            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading ? "Aguarde..." : isSignup ? "Criar conta" : "Entrar"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "Já tem conta?" : "Novo por aqui?"}{" "}
            <Link to="/auth" search={{ mode: isSignup ? "login" : "signup" }} className="font-medium text-primary hover:underline">
              {isSignup ? "Entrar" : "Criar conta"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
