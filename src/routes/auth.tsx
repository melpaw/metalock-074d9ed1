import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional().default("login"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Entrar — CryptoVault" }, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
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
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={isSignup ? "new-password" : "current-password"} />
            </div>
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
