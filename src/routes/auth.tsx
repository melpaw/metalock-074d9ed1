import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
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
  head: () => ({
    meta: [
      { title: "Sign in — MetaLock" },
      { name: "description", content: "Access your MetaLock vault. Sign in or create an account to manage identity-locked crypto wallets." },
      { property: "og:title", content: "Sign in — MetaLock" },
      { property: "og:description", content: "Access your MetaLock vault. Sign in or create an account to manage identity-locked crypto wallets." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const signupPasswordSchema = z.string().min(8);

function PasswordInput({
  id, value, onChange, autoComplete, minLength, showLabel, hideLabel,
}: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; minLength?: number; showLabel: string; hideLabel: string }) {
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
        aria-label={show ? hideLabel : showLabel}
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
  const { t } = useTranslation();
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
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
        redirectTo: "https://mymetalock.com/reset-password",
      });
      if (error) throw error;
      toast.success(t("auth.resetSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.emailError"));
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
          toast.error(t("auth.termsRequired"));
          setLoading(false);
          return;
        }
        if (Number(captchaInput) !== captcha.answer) {
          toast.error(t("auth.captchaWrong"));
          refreshCaptcha();
          setCaptchaInput("");
          setLoading(false);
          return;
        }
        const parsed = signupPasswordSchema.safeParse(password);
        if (!parsed.success) {
          toast.error(t("auth.pwInvalid"));
          setLoading(false);
          return;
        }
        if (password !== passwordConfirm) {
          toast.error(t("auth.pwMismatch"));
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: "https://mymetalock.com/dashboard",
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success(t("auth.accountCreated"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth.welcomeBack"));
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.authError"));
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
              <ShieldCheck className="h-3.5 w-3.5" /> {t("auth.brandBadge")}
            </div>
            <h2 className="mt-6 text-4xl font-bold tracking-tight">
              {t("auth.brandHeadlineA")} <span className="text-primary">{t("auth.brandHeadlineAccent")}</span>{t("auth.brandHeadlineB")}
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              {t("auth.brandLead")}
            </p>
          </div>

          <ul className="space-y-4 text-sm">
            {[
              { icon: Fingerprint, title: t("auth.feat1Title"), desc: t("auth.feat1Desc") },
              { icon: ShieldCheck, title: t("auth.feat2Title"), desc: t("auth.feat2Desc") },
              { icon: Lock, title: t("auth.feat3Title"), desc: t("auth.feat3Desc") },
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
            {isForgot ? t("auth.formReset") : isSignup ? t("auth.formSignup") : t("auth.formLogin")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isForgot ? t("auth.subReset") : isSignup ? t("auth.subSignup") : t("auth.subLogin")}
          </p>

          {isForgot ? (
            <form onSubmit={handleForgot} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <Button type="submit" className="w-full font-semibold" disabled={loading}>
                {loading ? t("auth.submitSending") : t("auth.submitReset")}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/auth" search={{ mode: "login" }} className="font-medium text-primary hover:underline">
                  {t("auth.backToLogin")}
                </Link>
              </p>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                {isSignup && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t("auth.password")}</Label>
                    {!isSignup && (
                      <Link to="/auth" search={{ mode: "forgot" }} className="text-xs text-primary hover:underline">
                        {t("auth.forgotPassword")}
                      </Link>
                    )}
                  </div>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={setPassword}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    minLength={isSignup ? 8 : 6}
                    showLabel={t("auth.showPw")}
                    hideLabel={t("auth.hidePw")}
                  />
                  {isSignup && (
                    <p className="text-xs text-muted-foreground">{t("auth.pwHint")}</p>
                  )}
                </div>
                {isSignup && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="passwordConfirm">{t("auth.confirmPassword")}</Label>
                      <PasswordInput
                        id="passwordConfirm"
                        value={passwordConfirm}
                        onChange={setPasswordConfirm}
                        autoComplete="new-password"
                        minLength={8}
                        showLabel={t("auth.showPw")}
                        hideLabel={t("auth.hidePw")}
                      />
                    </div>

                    {/* Captcha */}
                    <div className="space-y-2">
                      <Label htmlFor="captcha">
                        {t("auth.captchaLabel", { a: captcha.a, b: captcha.b })}
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
                          {t("auth.captchaNew")}
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
                        {t("auth.termsPrefix")}{" "}
                        <a href="/terms" className="text-primary hover:underline">{t("auth.termsService")}</a>{" "}
                        {t("auth.termsAnd")}{" "}
                        <a href="/privacy" className="text-primary hover:underline">{t("auth.termsPrivacy")}</a>
                        {t("auth.termsSuffix")}
                      </span>
                    </label>
                  </>
                )}
                <Button type="submit" className="w-full font-semibold" disabled={loading}>
                  {loading ? t("auth.submitLoading") : isSignup ? t("auth.submitSignup") : t("auth.submitLogin")}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {isSignup ? t("auth.alreadyHave") : t("auth.newHere")}{" "}
                <Link to="/auth" search={{ mode: isSignup ? "login" : "signup" }} className="font-medium text-primary hover:underline">
                  {isSignup ? t("auth.signInLink") : t("auth.createAccountLink")}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

