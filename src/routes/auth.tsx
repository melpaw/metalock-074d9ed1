import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, ShieldCheck, Fingerprint } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const searchSchema = z.object({
  mode: z.enum(["login", "signup", "forgot"]).optional().default("login"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Sign in — MetaLock" }, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

const signupPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[0-9]/, "Password must include at least 1 number");

function PasswordInput({
  id, value, onChange, autoComplete, minLength,
}: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; minLength?: number }) {
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
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function useCaptcha() {
  const [seed, setSeed] = useState(0);
  const challenge = useMemo(() => {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 1;
    return { a, b, answer: a + b };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);
  return { challenge, refresh: () => setSeed((s) => s + 1) };
}

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [captchaInput, setCaptchaInput] = useState("");
  const { challenge: captcha, refresh: refreshCaptcha } = useCaptcha();

  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("We've sent you a reset link. It expires in 1 hour.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send email");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        if (!acceptTerms) {
          toast.error("Please accept the Terms and Privacy Policy");
          setLoading(false);
          return;
        }
        if (Number(captchaInput) !== captcha.answer) {
          toast.error("Captcha incorrect — please try again");
          refreshCaptcha();
          setCaptchaInput("");
          setLoading(false);
          return;
        }
        const parsed = signupPasswordSchema.safeParse(password);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? "Invalid password");
          setLoading(false);
          return;
        }
        if (password !== passwordConfirm) {
          toast.error("Passwords do not match");
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
        toast.success("Account created! Redirecting…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Left: brand + security pitch */}
      <div className="hidden lg:flex flex-col justify-between p-12 gradient-surface border-r border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md gradient-primary text-primary-foreground">
            <Lock className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold">MetaLock</span>
        </Link>

        <div className="space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Security-first crypto vault
            </div>
            <h2 className="mt-6 text-4xl font-bold tracking-tight">
              Crypto, <span className="text-primary">locked to you</span>.
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              MetaLock only transfers to and from wallets registered under your own verified identity — so even a
              stolen password can't move your funds to a stranger.
            </p>
          </div>

          <ul className="space-y-4 text-sm">
            {[
              { icon: Fingerprint, title: "Identity-locked transfers", desc: "Every destination address must match a wallet in your own verified name." },
              { icon: ShieldCheck, title: "Layered authentication", desc: "Mandatory 2FA on withdrawals + device fingerprinting on every session." },
              { icon: Lock, title: "HSM-backed key custody", desc: "Private keys never leave hardware-backed enclaves in plaintext." },
            ].map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <f.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">{f.title}</div>
                  <div className="text-muted-foreground">{f.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} MetaLock</p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <div className="grid h-8 w-8 place-items-center rounded-md gradient-primary text-primary-foreground">
                <Lock className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold">MetaLock</span>
            </Link>
            <div className="ml-auto">
              <LanguageSwitcher />
            </div>
          </div>

          <h1 className="text-2xl font-bold">
            {isForgot ? "Reset your password" : isSignup ? "Create your secure account" : "Sign in"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isForgot
              ? "Enter your email and we'll send a reset link — valid for 1 hour."
              : isSignup
              ? "It only takes a moment. Free forever."
              : "Welcome back."}
          </p>

          {isForgot ? (
            <form onSubmit={handleForgot} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <Button type="submit" className="w-full font-semibold" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/auth" search={{ mode: "login" }} className="font-medium text-primary hover:underline">
                  ← Back to sign in
                </Link>
              </p>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                {isSignup && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {!isSignup && (
                      <Link to="/auth" search={{ mode: "forgot" }} className="text-xs text-primary hover:underline">
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={setPassword}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    minLength={isSignup ? 8 : 6}
                  />
                  {isSignup && (
                    <p className="text-xs text-muted-foreground">Minimum 8 characters and at least 1 number.</p>
                  )}
                </div>
                {isSignup && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="passwordConfirm">Confirm password</Label>
                      <PasswordInput
                        id="passwordConfirm"
                        value={passwordConfirm}
                        onChange={setPasswordConfirm}
                        autoComplete="new-password"
                        minLength={8}
                      />
                    </div>

                    {/* Captcha */}
                    <div className="space-y-2">
                      <Label htmlFor="captcha">
                        Security check — what is <span className="font-semibold">{captcha.a} + {captcha.b}</span>?
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="captcha"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={captchaInput}
                          onChange={(e) => setCaptchaInput(e.target.value.replace(/\D/g, ""))}
                          required
                          className="flex-1"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={() => { refreshCaptcha(); setCaptchaInput(""); }}>
                          New
                        </Button>
                      </div>
                    </div>

                    {/* Terms */}
                    <label className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3 text-sm">
                      <Checkbox
                        checked={acceptTerms}
                        onCheckedChange={(v) => setAcceptTerms(v === true)}
                        className="mt-0.5"
                      />
                      <span className="text-muted-foreground">
                        I accept the{" "}
                        <a href="/terms" className="text-primary hover:underline">Terms of Service</a>{" "}
                        and{" "}
                        <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>, and
                        confirm I am creating this account for myself.
                      </span>
                    </label>
                  </>
                )}
                <Button type="submit" className="w-full font-semibold" disabled={loading}>
                  {loading ? "Please wait…" : isSignup ? "Create secure account" : t("common.signIn")}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {isSignup ? "Already have an account?" : "New here?"}{" "}
                <Link to="/auth" search={{ mode: isSignup ? "login" : "signup" }} className="font-medium text-primary hover:underline">
                  {isSignup ? t("common.signIn") : "Create account"}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
