import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Lock,
  ShieldCheck,
  Fingerprint,
  KeyRound,
  Wallet,
  Eye,
  Check,
  X,
  Bitcoin,
  CircleDollarSign,
  Sparkles,
  ChevronRight,
} from "lucide-react";
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
          "MetaLock is the identity-locked crypto vault. Every withdrawal is bound to a wallet in your verified name — even a stolen password cannot move your funds.",
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

/* ---------- shared bits ---------- */

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary text-primary-foreground shadow-[0_8px_30px_-8px_oklch(0.76_0.185_82_/_0.6)] transition-transform duration-500 hover:rotate-[-6deg] hover:scale-110">
        <Lock className="h-4 w-4" strokeWidth={2.75} />
      </div>
      <span className="text-lg font-black tracking-tight">MetaLock</span>
    </Link>
  );
}

/** Staggered word-by-word reveal, inspired by the onramper hero. */
function WordReveal({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom pr-[0.28em]">
          <span
            className="inline-block animate-[wordUp_0.9s_cubic-bezier(0.2,0.7,0.2,1)_both]"
            style={{ animationDelay: `${delay + i * 70}ms` }}
          >
            {w}
          </span>
        </span>
      ))}
    </span>
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

/* ---------- hero floating mock UI ---------- */

function HeroMock() {
  const { t } = useTranslation();
  return (
    <div className="relative mx-auto h-[520px] w-full max-w-[520px]">
      {/* background halo */}
      <div className="absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle_at_50%_40%,oklch(0.76_0.185_82_/_0.35),transparent_60%)] blur-3xl" />

      {/* main card: outgoing transfer with identity check */}
      <div className="absolute left-1/2 top-4 w-[340px] -translate-x-1/2 animate-[float_7s_ease-in-out_infinite] rounded-2xl border border-border/80 bg-surface-elevated/95 p-5 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("landing.mock.outgoing")}</span>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">Live</span>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{t("landing.mock.amount")}</div>
            <div className="mt-1 text-3xl font-black tracking-tight">0.482 <span className="text-primary">BTC</span></div>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
            <Bitcoin className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-border bg-surface/60 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("landing.mock.to")}</div>
          <div className="mt-1 font-mono text-xs text-foreground/90">bc1q…9x2ykxa · <span className="text-up">{t("landing.mock.wallet")}</span></div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-up/10 px-3 py-2 text-xs font-medium text-up">
          <Check className="h-4 w-4" /> {t("landing.mock.verified")}
        </div>
        <button className="mt-4 w-full rounded-lg gradient-primary py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02]">
          {t("landing.mock.confirm")}
        </button>
      </div>

      {/* mini blocked card */}
      <div className="absolute -left-2 top-56 w-[240px] animate-[float_8s_ease-in-out_infinite_-2s] rounded-2xl border border-down/40 bg-surface-elevated/95 p-4 shadow-xl backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-down/15 text-down">
            <X className="h-4 w-4" strokeWidth={3} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold">0x71…C0A2</div>
            <div className="truncate text-[10px] text-muted-foreground">{t("landing.mock.blocked")}</div>
          </div>
        </div>
      </div>

      {/* 2FA card */}
      <div className="absolute -right-2 top-72 w-[220px] animate-[float_9s_ease-in-out_infinite_-4s] rounded-2xl border border-border bg-surface-elevated/95 p-4 shadow-xl backdrop-blur">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> {t("landing.mock.twofa")}
        </div>
        <div className="mt-3 flex gap-1.5">
          {["4", "8", "2", "1", "0", "6"].map((n, i) => (
            <div
              key={i}
              className="grid h-9 flex-1 place-items-center rounded-md border border-border bg-surface font-mono text-sm font-bold"
              style={{ animation: `pulseGlow 2.4s ease-in-out ${i * 0.15}s infinite` }}
            >
              {n}
            </div>
          ))}
        </div>
      </div>

      {/* floating coin bubbles */}
      <div className="absolute right-6 top-2 grid h-14 w-14 animate-[floatSlow_6s_ease-in-out_infinite] place-items-center rounded-2xl border border-border bg-surface-elevated/90 shadow-lg backdrop-blur">
        <Bitcoin className="h-6 w-6 text-primary" />
      </div>
      <div className="absolute -left-4 top-20 grid h-12 w-12 animate-[floatSlow_7s_ease-in-out_infinite_-1s] place-items-center rounded-xl border border-border bg-surface-elevated/90 shadow-lg backdrop-blur">
        <CircleDollarSign className="h-5 w-5 text-primary" />
      </div>
      <div className="absolute bottom-6 right-2 grid h-10 w-10 animate-[floatSlow_8s_ease-in-out_infinite_-3s] place-items-center rounded-xl border border-border bg-surface-elevated/90 shadow-lg backdrop-blur">
        <KeyRound className="h-4 w-4 text-primary" />
      </div>
    </div>
  );
}

/* ---------- main page ---------- */

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

  const steps = [
    { k: "step1", icon: Fingerprint },
    { k: "step2", icon: Wallet },
    { k: "step3", icon: ShieldCheck },
  ] as const;

  const testimonials = ["t1", "t2", "t3"] as const;

  const trustBrands = ["Bitcoin", "Ethereum", "Solana", "Chainlink", "Polygon", "Avalanche", "Arbitrum", "Optimism"];

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      {/* keyframes local to this page */}
      <style>{`
        @keyframes wordUp { 0% { transform: translateY(110%); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes float { 0%,100% { transform: translate(-50%, 0px); } 50% { transform: translate(-50%, -14px); } }
        @keyframes floatSlow { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-18px); } }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 oklch(0.76 0.185 82 / 0); } 50% { box-shadow: 0 0 0 3px oklch(0.76 0.185 82 / 0.25); } }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes gridDrift { 0% { background-position: 0 0; } 100% { background-position: 60px 60px; } }
        @keyframes auroraShift { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(3%,-2%,0) scale(1.05); } }
        .float-fix { transform: translate(-50%, 0); }
      `}</style>

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link to="/auth" search={{ mode: "login" }}>
              <Button variant="ghost" size="sm">{t("landing.signIn")}</Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm" className="rounded-full font-bold transition-transform hover:scale-105">
                {t("landing.signUp")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* aurora + grid background */}
        <div
          className="absolute inset-0 -z-10 animate-[auroraShift_14s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 15% 10%, oklch(0.76 0.185 82 / 0.22), transparent 60%), radial-gradient(ellipse 50% 40% at 85% 30%, oklch(0.68 0.19 70 / 0.18), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 -z-10 opacity-[0.06] animate-[gridDrift_30s_linear_infinite]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.96 0.005 260) 1px, transparent 1px), linear-gradient(90deg, oklch(0.96 0.005 260) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse at center top, black 40%, transparent 75%)",
          }}
        />

        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-6 pt-16 pb-24 md:pt-24 md:pb-32 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary shadow-[0_0_30px_-10px_oklch(0.76_0.185_82_/_0.6)]">
              <Sparkles className="h-3.5 w-3.5" />
              {t("landing.heroBadge")}
            </div>
            <h1 className="text-5xl font-black leading-[0.95] tracking-tight md:text-6xl lg:text-7xl xl:text-8xl">
              <WordReveal text={t("landing.heroTitleA")} />
              <br />
              <WordReveal text={t("landing.heroTitleAccent")} delay={200} className="text-primary" />
              <WordReveal text={t("landing.heroTitleB")} delay={400} />
            </h1>
            <Reveal delay={600}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                {t("landing.heroSubtitle")}
              </p>
            </Reveal>
            <Reveal delay={720}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/auth" search={{ mode: "signup" }}>
                  <Button size="lg" className="group h-12 rounded-full px-6 font-bold shadow-lg transition-transform hover:scale-[1.03]">
                    {t("landing.ctaPrimary")}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link to="/auth" search={{ mode: "login" }}>
                  <Button size="lg" variant="outline" className="h-12 rounded-full border-border/80 px-6 transition-transform hover:scale-[1.03]">
                    {t("landing.ctaSecondary")}
                  </Button>
                </Link>
              </div>
            </Reveal>

            {/* trust chips */}
            <Reveal delay={840}>
              <div className="mt-12 grid max-w-lg grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: t("landing.trust.encryption"), value: "AES-256" },
                  { label: t("landing.trust.transport"), value: "TLS 1.3" },
                  { label: t("landing.trust.key"), value: "HSM" },
                  { label: t("landing.trust.uptime"), value: "99.99%" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border/60 bg-surface/60 px-3 py-2.5 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
                    <div className="mt-0.5 text-sm font-bold">{s.value}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={300} className="min-w-0">
            <HeroMock />
          </Reveal>
        </div>
      </section>

      {/* TRUSTED-BY MARQUEE */}
      <section className="border-y border-border/60 bg-surface/40 py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            {t("landing.trustedBy")}
          </div>
          <div className="mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]">
            <div className="flex w-max animate-[marquee_28s_linear_infinite] gap-14">
              {[...trustBrands, ...trustBrands].map((b, i) => (
                <span key={i} className="text-2xl font-black uppercase tracking-tight text-muted-foreground/60 transition-colors hover:text-foreground">
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BENTO — built like a vault */}
      <section className="relative py-28">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                <span className="h-px w-8 bg-primary" /> {t("landing.guaranteeKicker")}
              </div>
              <h2 className="text-4xl font-black leading-tight tracking-tight md:text-5xl lg:text-6xl">
                {t("landing.bento.title")}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">{t("landing.bento.subtitle")}</p>
            </div>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-6 md:grid-rows-2">
            {/* Big card — identity lock */}
            <Reveal className="md:col-span-4 md:row-span-2">
              <div className="group relative h-full overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface-elevated via-surface to-background p-8 transition-all hover:border-primary/40">
                <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl transition-all duration-700 group-hover:scale-125" />
                <div className="relative flex h-full flex-col">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
                    <Fingerprint className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-2xl font-black md:text-3xl">{t("landing.bento.identityTitle")}</h3>
                  <p className="mt-3 max-w-md text-muted-foreground">{t("landing.bento.identityDesc")}</p>

                  {/* mock verify list */}
                  <div className="mt-8 space-y-2">
                    {[
                      { ok: true, addr: "bc1q…9x2ykxa", label: t("landing.mock.verified") },
                      { ok: true, addr: "0x8Ac…4d21", label: t("landing.mock.verified") },
                      { ok: false, addr: "0x71b…C0A2", label: t("landing.mock.blocked") },
                    ].map((row, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-border/70 bg-surface/70 px-4 py-3 backdrop-blur transition-all hover:border-primary/40"
                        style={{ animation: `wordUp 0.6s ease-out ${i * 0.15}s both` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`grid h-8 w-8 place-items-center rounded-lg ${row.ok ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
                            {row.ok ? <Check className="h-4 w-4" strokeWidth={3} /> : <X className="h-4 w-4" strokeWidth={3} />}
                          </div>
                          <span className="font-mono text-sm">{row.addr}</span>
                        </div>
                        <span className={`text-xs font-semibold ${row.ok ? "text-up" : "text-down"}`}>{row.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Keys card */}
            <Reveal delay={100} className="md:col-span-2">
              <div className="group relative h-full overflow-hidden rounded-3xl border border-border bg-surface p-6 transition-all hover:-translate-y-1 hover:border-primary/40">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-black">{t("landing.bento.keysTitle")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t("landing.bento.keysDesc")}</p>
                <div className="mt-6 flex gap-1.5">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 flex-1 rounded-sm bg-gradient-to-b from-primary/60 to-primary/20"
                      style={{ opacity: 0.25 + (i % 4) * 0.2, animation: `pulseGlow 2s ease-in-out ${i * 0.05}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Auth card */}
            <Reveal delay={200} className="md:col-span-2">
              <div className="group relative h-full overflow-hidden rounded-3xl border border-border bg-surface p-6 transition-all hover:-translate-y-1 hover:border-primary/40">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-black">{t("landing.bento.authTitle")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t("landing.bento.authDesc")}</p>
                <div className="mt-6 flex gap-2">
                  {["4", "8", "2", "1", "0", "6"].map((n, i) => (
                    <div
                      key={i}
                      className="grid h-10 flex-1 place-items-center rounded-lg border border-border bg-background font-mono text-base font-black"
                      style={{ animation: `pulseGlow 2.4s ease-in-out ${i * 0.15}s infinite` }}
                    >
                      {n}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative border-t border-border/60 py-28">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="max-w-3xl">
              <h2 className="text-4xl font-black tracking-tight md:text-5xl lg:text-6xl">{t("landing.how.title")}</h2>
              <p className="mt-4 text-lg text-muted-foreground">{t("landing.how.subtitle")}</p>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.k} delay={i * 120}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-surface p-7 transition-all duration-500 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_20px_60px_-20px_oklch(0.76_0.185_82_/_0.4)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">{t(`landing.how.${s.k}Kicker`)}</span>
                    <s.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                  <div className="mt-8 text-[64px] font-black leading-none tracking-tighter text-primary/20 transition-colors group-hover:text-primary/40">
                    0{i + 1}
                  </div>
                  <h3 className="mt-2 text-xl font-black">{t(`landing.how.${s.k}Title`)}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{t(`landing.how.${s.k}Desc`)}</p>
                  {i < steps.length - 1 && (
                    <ChevronRight className="absolute right-6 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-border md:block" />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* GUARANTEE — huge statement */}
      <section className="relative border-t border-border/60 py-32">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-surface-elevated to-background p-10 md:p-16">
              <div className="absolute -right-32 -top-32 h-96 w-96 animate-[floatSlow_10s_ease-in-out_infinite] rounded-full bg-primary/25 blur-3xl" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
                  <Fingerprint className="h-3.5 w-3.5" />
                  {t("landing.guaranteeKicker")}
                </div>
                <h2 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                  {t("landing.guaranteeTitle")}
                </h2>
                <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
                  {t("landing.guaranteeBody")}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PILLARS — 6 cards */}
      <section className="border-t border-border/60 py-28">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">{t("landing.pillarsTitle")}</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">{t("landing.pillarsSubtitle")}</p>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pillars.map((f, i) => (
              <Reveal key={f.key} delay={i * 60}>
                <div className="group h-full rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-surface-elevated hover:shadow-[0_20px_60px_-30px_oklch(0.76_0.185_82_/_0.5)]">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground transition-transform group-hover:scale-110 group-hover:rotate-[-6deg]">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold">{t(`landing.pillars.${f.key}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`landing.pillars.${f.key}.desc`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-t border-border/60 bg-surface/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <h2 className="text-center text-3xl font-black tracking-tight md:text-4xl">{t("landing.stats.title")}</h2>
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: t("landing.stats.protected"), sub: t("landing.stats.protectedSuffix"), node: <CountUp to={1.2} decimals={1} prefix="$" suffix="B+" /> },
              { label: t("landing.stats.clients"), sub: t("landing.stats.clientsSuffix"), node: <CountUp to={42000} suffix="+" /> },
              { label: t("landing.stats.uptime"), sub: t("landing.stats.uptimeSuffix"), node: <CountUp to={99.99} decimals={2} suffix="%" /> },
              { label: t("landing.stats.breaches"), sub: t("landing.stats.breachesSuffix"), node: <CountUp to={0} /> },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 80}>
                <div className="rounded-2xl border border-border bg-background p-7 text-center transition-all hover:-translate-y-1 hover:border-primary/40">
                  <div className="text-4xl font-black text-primary md:text-5xl">{s.node}</div>
                  <div className="mt-3 text-sm font-semibold">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.sub}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-t border-border/60 py-28">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <h2 className="max-w-3xl text-4xl font-black tracking-tight md:text-5xl">{t("landing.testimonials.title")}</h2>
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {testimonials.map((k, i) => (
              <Reveal key={k} delay={i * 120}>
                <figure className="flex h-full flex-col rounded-2xl border border-border bg-surface p-7 transition-all hover:-translate-y-1 hover:border-primary/40">
                  <div className="text-primary">
                    {"★★★★★".split("").map((s, j) => (
                      <span key={j} className="inline-block">{s}</span>
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 text-base leading-relaxed text-foreground/90">
                    "{t(`landing.testimonials.${k}Quote`)}"
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-border/60 pt-4">
                    <div className="grid h-10 w-10 place-items-center rounded-full gradient-primary text-sm font-black text-primary-foreground">
                      {t(`landing.testimonials.${k}Name`).charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{t(`landing.testimonials.${k}Name`)}</div>
                      <div className="text-xs text-muted-foreground">{t(`landing.testimonials.${k}Role`)}</div>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative border-t border-border/60 py-32">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 50% 60% at 50% 50%, oklch(0.76 0.185 82 / 0.18), transparent 65%)",
          }}
        />
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Reveal>
            <h2 className="text-4xl font-black tracking-tight md:text-6xl lg:text-7xl">{t("landing.ctaFinal.title")}</h2>
            <p className="mt-5 text-lg text-muted-foreground">{t("landing.ctaFinal.subtitle")}</p>
            <div className="mt-10">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" className="group h-14 rounded-full px-8 text-base font-bold shadow-xl transition-transform hover:scale-105">
                  {t("landing.ctaFinal.button")}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Logo />
          </div>
          <div>© {new Date().getFullYear()} MetaLock. {t("landing.footer")}</div>
        </div>
      </footer>
    </div>
  );
}
