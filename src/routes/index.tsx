import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lock, ShieldCheck, Fingerprint, KeyRound, Wallet, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MetaLock — Secure crypto vault with identity-locked transfers" },
      {
        name: "description",
        content:
          "MetaLock is a security-first crypto platform. Send and receive only from wallets registered to your own verified identity — even a stolen password cannot move your funds.",
      },
      { property: "og:title", content: "MetaLock — Identity-locked crypto vault" },
      { property: "og:description", content: "A crypto vault engineered around identity-locked transfers, hardware-grade key isolation and full audit trails." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://vaultmelpaw.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://vaultmelpaw.lovable.app/" }],
  }),
  component: Landing,
});

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="grid h-8 w-8 place-items-center rounded-md gradient-primary text-primary-foreground">
        <Lock className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <span className="text-lg font-bold tracking-tight">MetaLock</span>
    </Link>
  );
}

function Landing() {

  const pillars = [
    {
      icon: Fingerprint,
      title: "Identity-locked transfers",
      desc: "You can only send to — and receive from — wallets registered under your own verified identity (KYC + bank statement). A stolen password or compromised device cannot move funds to a stranger's wallet.",
    },
    {
      icon: KeyRound,
      title: "Isolated key custody",
      desc: "Private keys are generated and stored in hardware-backed enclaves, sharded and never exposed to the browser or the server in plaintext.",
    },
    {
      icon: ShieldCheck,
      title: "Layered authentication",
      desc: "Email + password, mandatory 2FA on withdrawals, device fingerprinting, and step-up verification on every high-value operation.",
    },
    {
      icon: Eye,
      title: "Transparent audit trail",
      desc: "Every login, permission change, deposit, transfer and admin action is signed and written to an immutable audit log — reviewable at any time.",
    },
    {
      icon: Wallet,
      title: "Segregated multi-asset wallets",
      desc: "BTC, ETH and stablecoins are held in separate, individually-audited wallets — no commingling, no shared hot-wallet exposure.",
    },
    {
      icon: Lock,
      title: "End-to-end encryption",
      desc: "AES-256 at rest, TLS 1.3 in transit, and encrypted client-side inputs for anything containing personal data or wallet addresses.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link to="/auth" search={{ mode: "login" }}>
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm" className="font-semibold">Sign up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{ background: "radial-gradient(ellipse at top, oklch(0.82 0.16 90 / 0.15), transparent 60%)" }}
        />
        <div className="mx-auto max-w-7xl px-6 py-24 text-center md:py-32">
          <Reveal>
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Security-first crypto vault
            </div>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Your crypto, locked to <span className="text-primary">your identity</span>.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              MetaLock only lets you transfer to wallets registered in your own verified name. Even if an attacker
              stole your credentials, they still couldn't move a single coin out.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" className="font-semibold">
                  Create secure account <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth" search={{ mode: "login" }}>
                <Button size="lg" variant="outline">Sign in</Button>
              </Link>
            </div>
          </Reveal>

          {/* Trust bar */}
          <Reveal delay={320}>
            <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: "Encryption", value: "AES-256" },
                { label: "Transport", value: "TLS 1.3" },
                { label: "Key custody", value: "HSM-backed" },
                { label: "Uptime", value: "99.99%" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border bg-surface p-4 text-left">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="mt-1 text-2xl font-bold">{s.value}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Signature guarantee */}
      <section className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal>
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-8 md:p-12">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/20 text-primary">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">The MetaLock guarantee</span>
              </div>
              <h2 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
                A hacker with your password still can't steal your crypto.
              </h2>
              <p className="mt-4 max-w-3xl text-muted-foreground">
                Every withdrawal address is cryptographically bound to a wallet registered under your verified
                identity. Unknown destinations are rejected at the protocol level — not by a warning banner you can
                click through. This is our headline defence, and it is on by default for every account.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Security pillars */}
      <section className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How we protect every account</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Defence in depth: identity, keys, sessions, transport, storage and audit — hardened at every layer.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pillars.map((f, i) => (
              <Reveal key={f.title} delay={i * 60}>
                <div className="group h-full rounded-xl border border-border bg-surface p-6 transition hover:border-primary/50 hover:bg-surface-elevated">
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
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
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Open a vault in under a minute.</h2>
            <p className="mt-3 text-muted-foreground">
              Sign up, verify your identity, and your account is locked to you — end to end.
            </p>
            <div className="mt-8">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" className="font-semibold">
                  Get started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} MetaLock. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
