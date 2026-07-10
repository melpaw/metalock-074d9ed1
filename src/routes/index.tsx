import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Lock, ShieldCheck, Fingerprint, KeyRound, Wallet, Eye, ArrowDownUp, Check } from "lucide-react";
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
    <Link to="/" className="flex items-center gap-2 group">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background transition-transform group-hover:scale-105">
        <Lock className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <span className="text-lg font-bold tracking-tight">MetaLock</span>
    </Link>
  );
}

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

/** Decorative floating glass orbs — Onramper-style pastel gradient spheres. */
function Orbs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="orb animate-float" style={{
        top: "-6rem", left: "-4rem", width: "22rem", height: "22rem",
        background: "radial-gradient(circle at 30% 30%, oklch(0.9 0.09 240 / 0.9), oklch(0.85 0.12 260 / 0.4) 60%, transparent 75%)",
      }} />
      <div className="orb animate-float" style={{
        top: "18rem", right: "-8rem", width: "28rem", height: "28rem", animationDelay: "1.5s",
        background: "radial-gradient(circle at 30% 30%, oklch(0.92 0.08 350 / 0.85), oklch(0.88 0.1 20 / 0.35) 60%, transparent 75%)",
      }} />
      <div className="orb animate-float" style={{
        bottom: "-10rem", left: "20%", width: "26rem", height: "26rem", animationDelay: "3s",
        background: "radial-gradient(circle at 30% 30%, oklch(0.88 0.1 300 / 0.7), oklch(0.9 0.08 260 / 0.3) 60%, transparent 75%)",
      }} />
    </div>
  );
}

/** Onramper-style widget mockup — identity-locked transfer preview. */
function VaultWidget() {
  return (
    <div className="glass-card w-full max-w-sm p-6 shadow-[0_30px_80px_-20px_oklch(0.14_0.01_260/0.25)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background">
            <Lock className="h-3.5 w-3.5" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold">Vault Transfer</span>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          <Check className="mr-1 inline h-3 w-3" /> Identity locked
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-foreground/8 bg-white/70 p-4">
        <div className="text-xs text-muted-foreground">You send</div>
        <div className="mt-1 flex items-center justify-between">
          <div className="text-3xl font-black tracking-tight">0.842</div>
          <button className="flex items-center gap-1.5 rounded-full border border-foreground/10 bg-white px-3 py-1.5 text-sm font-semibold shadow-sm">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-500 text-[10px] font-black text-white">₿</span>
            BTC
          </button>
        </div>
      </div>

      <div className="relative -my-2 grid place-items-center">
        <div className="grid h-9 w-9 place-items-center rounded-full border border-foreground/10 bg-white shadow-sm">
          <ArrowDownUp className="h-4 w-4" />
        </div>
      </div>

      <div className="rounded-2xl border border-foreground/8 bg-white/70 p-4">
        <div className="text-xs text-muted-foreground">Destination — verified wallet</div>
        <div className="mt-1 flex items-center justify-between">
          <div className="font-mono text-sm font-semibold">bc1q…9x4t</div>
          <span className="flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1 text-xs">
            <Fingerprint className="h-3 w-3" /> You
          </span>
        </div>
      </div>

      <button className="btn-pill mt-5 w-full">Confirm with biometrics <ArrowRight className="h-4 w-4" /></button>
      <div className="mt-3 text-center text-[11px] text-muted-foreground">Signed by MetaLock HSM · Audit ID #A9F3</div>
    </div>
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
    <div className="min-h-screen text-foreground">
      {/* Nav */}
      <header className="sticky top-4 z-50 mx-auto max-w-6xl px-4">
        <div className="glass flex items-center justify-between rounded-full px-4 py-2.5">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <a href="#security" className="text-foreground/70 hover:text-foreground">Security</a>
            <a href="#vault" className="text-foreground/70 hover:text-foreground">Vault</a>
            <a href="#stats" className="text-foreground/70 hover:text-foreground">Trust</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link to="/auth" search={{ mode: "login" }}>
              <Button variant="ghost" size="sm">{t("landing.signIn")}</Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm" className="hidden sm:inline-flex">{t("landing.signUp")} <ArrowUpRight className="h-3.5 w-3.5" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <Orbs />
        <div className="mx-auto grid max-w-7xl gap-16 px-6 pb-20 pt-20 md:pt-28 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-8">
          <div>
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-white/60 px-3 py-1 text-xs font-medium backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t("landing.heroBadge")}
              </div>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-tight md:text-7xl lg:text-[5.2rem]">
                {t("landing.heroTitleA")}
                <span className="block bg-gradient-to-r from-foreground via-foreground to-indigo-600 bg-clip-text text-transparent">
                  {t("landing.heroTitleAccent")}
                </span>
                {t("landing.heroTitleB")}
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
                {t("landing.heroSubtitle")}
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/auth" search={{ mode: "signup" }}>
                  <Button size="lg" className="group">
                    {t("landing.ctaPrimary")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link to="/auth" search={{ mode: "login" }}>
                  <Button size="lg" variant="outline">{t("landing.ctaSecondary")}</Button>
                </Link>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <div className="mt-10 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> AES-256 · HSM</span>
                <span className="flex items-center gap-2"><Fingerprint className="h-3.5 w-3.5 text-indigo-600" /> Biometric MFA</span>
                <span className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-rose-600" /> Full audit trail</span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200}>
            <div className="relative flex justify-center lg:justify-end">
              <div aria-hidden className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-indigo-200/40 via-rose-200/30 to-sky-200/40 blur-2xl" />
              <VaultWidget />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Trust strip */}
      <section id="stats" className="mx-auto max-w-7xl px-6 py-8">
        <div className="glass-card grid grid-cols-2 gap-4 p-6 md:grid-cols-4 md:p-8">
          {[
            { label: t("landing.stats.protected"), sub: t("landing.stats.protectedSuffix"), node: <CountUp to={1.2} decimals={1} prefix="$" suffix="B+" /> },
            { label: t("landing.stats.clients"), sub: t("landing.stats.clientsSuffix"), node: <CountUp to={42000} suffix="+" /> },
            { label: t("landing.stats.uptime"), sub: t("landing.stats.uptimeSuffix"), node: <CountUp to={99.99} decimals={2} suffix="%" /> },
            { label: t("landing.stats.breaches"), sub: t("landing.stats.breachesSuffix"), node: <CountUp to={0} /> },
          ].map((s) => (
            <div key={s.label} className="text-center md:text-left">
              <div className="text-3xl font-black tracking-tight md:text-4xl">{s.node}</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</div>
              <div className="text-xs text-muted-foreground/80">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Signature guarantee */}
      <section id="vault" className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <div className="glass-card relative overflow-hidden p-10 md:p-14">
            <div aria-hidden className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-300/40 to-rose-300/40 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-700 backdrop-blur">
                <Fingerprint className="h-3.5 w-3.5" /> {t("landing.guaranteeKicker")}
              </div>
              <h2 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-5xl">
                {t("landing.guaranteeTitle")}
              </h2>
              <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
                {t("landing.guaranteeBody")}
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Security pillars */}
      <section id="security" className="mx-auto max-w-7xl px-6 py-16">
        <Reveal>
          <div className="mb-12 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest backdrop-blur">
              Layered defense
            </div>
            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">{t("landing.pillarsTitle")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("landing.pillarsSubtitle")}</p>
          </div>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map((f, i) => (
            <Reveal key={f.key} delay={i * 60}>
              <div className="glass-card group hover-lift h-full p-7">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-rose-500 text-white shadow-[0_8px_20px_-8px_oklch(0.55_0.18_280/0.6)]">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold">{t(`landing.pillars.${f.key}.title`)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(`landing.pillars.${f.key}.desc`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <Reveal>
          <div className="glass-card relative overflow-hidden p-12 text-center md:p-16">
            <div aria-hidden className="absolute inset-0 -z-10 opacity-70" style={{ background: "var(--gradient-hero)" }} />
            <h2 className="text-4xl font-black tracking-tight md:text-6xl">{t("landing.ctaFinal.title")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">{t("landing.ctaFinal.subtitle")}</p>
            <div className="mt-8">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" className="group">
                  {t("landing.ctaFinal.button")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="mx-auto max-w-7xl px-6 pb-10">
        <div className="flex flex-col items-center justify-between gap-3 border-t border-foreground/8 pt-8 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Logo />
          </div>
          <div>© {new Date().getFullYear()} MetaLock. {t("landing.footer")}</div>
        </div>
      </footer>
    </div>
  );
}
