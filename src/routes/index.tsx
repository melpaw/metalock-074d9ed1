import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lock, ShieldCheck, Fingerprint, KeyRound, Wallet, Eye } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MetaLock — Identity-locked crypto vault" },
      {
        name: "description",
        content:
          "Security-first crypto vault. Send and receive only from wallets tied to your verified identity — even a stolen password cannot move your funds.",
      },
      { property: "og:title", content: "MetaLock — Identity-locked crypto vault" },
      { property: "og:description", content: "A crypto vault engineered around identity-locked transfers, hardware-grade key isolation and full audit trails." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://metalock.lovable.app/" },
      { name: "twitter:title", content: "MetaLock — Identity-locked crypto vault" },
      { name: "twitter:description", content: "A crypto vault engineered around identity-locked transfers, hardware-grade key isolation and full audit trails." },
    ],
    links: [{ rel: "canonical", href: "https://metalock.lovable.app/" }],
  }),
  component: Landing,
});

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="grid h-8 w-8 place-items-center rounded-md gradient-primary text-primary-foreground transition-transform hover:scale-110">
        <Lock className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <span className="text-lg font-bold tracking-tight">MetaLock</span>
    </Link>
  );
}

/** Count-up number animation triggered on viewport enter. */
function CountUp({ to, prefix = "", suffix = "", decimals = 0, duration = 1400 }: {
  to: number; prefix?: string; suffix?: string; decimals?: number; duration?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || started.current) return;
        started.current = true;
        const start = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(to * eased);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.3 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [to, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

function Landing() {
  const { t } = useTranslation();

  const pillars = [
    { icon: Fingerprint, key: "identity" },
    { icon: KeyRound, key: "keys" },
    { icon: ShieldCheck, key: "auth" },
    { icon: Eye, key: "audit" },
    { icon: Wallet, key: "wallets" },
    { icon: Lock, key: "encryption" },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link to="/auth" search={{ mode: "login" }}>
              <Button variant="ghost" size="sm">{t("landing.signIn")}</Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm" className="font-semibold transition-transform hover:scale-105">{t("landing.signUp")}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-40 animate-pulse"
          style={{ background: "radial-gradient(ellipse at top, oklch(0.82 0.16 90 / 0.15), transparent 60%)", animationDuration: "8s" }}
        />
        <div className="mx-auto max-w-7xl px-6 py-24 text-center md:py-32">
          <Reveal>
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              {t("landing.heroBadge")}
            </div>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              {t("landing.heroTitleA")} <span className="text-primary">{t("landing.heroTitleAccent")}</span>{t("landing.heroTitleB")}
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              {t("landing.heroSubtitle")}
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" className="font-semibold transition-transform hover:scale-[1.03]">
                  {t("landing.ctaPrimary")} <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/auth" search={{ mode: "login" }}>
                <Button size="lg" variant="outline" className="transition-transform hover:scale-[1.03]">{t("landing.ctaSecondary")}</Button>
              </Link>
            </div>
          </Reveal>

          {/* Trust bar */}
          <Reveal delay={320}>
            <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: t("landing.trust.encryption"), value: "AES-256" },
                { label: t("landing.trust.transport"), value: "TLS 1.3" },
                { label: t("landing.trust.key"), value: "HSM-backed" },
                { label: t("landing.trust.uptime"), value: "99.99%" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-elevated">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="mt-1 text-2xl font-bold">{s.value}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Stats counter */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">{t("landing.stats.title")}</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: t("landing.stats.protected"), sub: t("landing.stats.protectedSuffix"), node: <CountUp to={1.2} decimals={1} prefix="$" suffix="B+" /> },
              { label: t("landing.stats.clients"), sub: t("landing.stats.clientsSuffix"), node: <CountUp to={42000} suffix="+" /> },
              { label: t("landing.stats.uptime"), sub: t("landing.stats.uptimeSuffix"), node: <CountUp to={99.99} decimals={2} suffix="%" /> },
              { label: t("landing.stats.breaches"), sub: t("landing.stats.breachesSuffix"), node: <CountUp to={0} /> },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 80}>
                <div className="rounded-xl border border-border bg-surface p-6 text-center transition-all hover:-translate-y-1 hover:border-primary/40 hover:bg-surface-elevated">
                  <div className="text-3xl font-black text-primary md:text-4xl">{s.node}</div>
                  <div className="mt-2 text-sm font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.sub}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Signature guarantee */}
      <section className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal>
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-8 transition-all hover:border-primary/50 md:p-12">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/20 text-primary">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">{t("landing.guaranteeKicker")}</span>
              </div>
              <h2 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
                {t("landing.guaranteeTitle")}
              </h2>
              <p className="mt-4 max-w-3xl text-muted-foreground">
                {t("landing.guaranteeBody")}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Security pillars */}
      <section className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("landing.pillarsTitle")}</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {t("landing.pillarsSubtitle")}
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pillars.map((f, i) => (
              <Reveal key={f.key} delay={i * 60}>
                <div className="group h-full rounded-xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-surface-elevated hover:shadow-lg hover:shadow-primary/5">
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-accent-foreground transition-transform group-hover:scale-110">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-semibold">{t(`landing.pillars.${f.key}.title`)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t(`landing.pillars.${f.key}.desc`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("landing.ctaFinal.title")}</h2>
            <p className="mt-3 text-muted-foreground">
              {t("landing.ctaFinal.subtitle")}
            </p>
            <div className="mt-8">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" className="group font-semibold transition-transform hover:scale-105">
                  {t("landing.ctaFinal.button")} <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} MetaLock. {t("landing.footer")}
        </div>
      </footer>
    </div>
  );
}
