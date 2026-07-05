import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Shield, TrendingUp, Wallet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

const features = [
  { icon: Wallet, title: "Wallet multi-cripto", desc: "Gerencie BTC, ETH, USDT e mais em uma única carteira integrada." },
  { icon: TrendingUp, title: "Investimentos inteligentes", desc: "Planos com rendimento diário, do Bronze ao VIP." },
  { icon: Shield, title: "Segurança de nível bancário", desc: "2FA, criptografia AES e auditoria completa de ações." },
  { icon: Zap, title: "Depósitos instantâneos", desc: "Deposite, invista e retire em segundos, 24/7." },
];

const stats = [
  { label: "Volume 24h", value: "$1.2B", change: "+12.4%", up: true },
  { label: "Usuários ativos", value: "180K+", change: "+8.1%", up: true },
  { label: "Criptomoedas", value: "50+", change: "", up: true },
  { label: "Uptime", value: "99.99%", change: "", up: true },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md gradient-primary font-black text-primary-foreground">C</div>
            <span className="text-lg font-bold tracking-tight">CryptoVault</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#mercado" className="hover:text-foreground">Mercado</a>
            <a href="#recursos" className="hover:text-foreground">Recursos</a>
            <a href="#planos" className="hover:text-foreground">Planos</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" search={{ mode: "login" }}>
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm" className="font-semibold">Criar conta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40" style={{
          background: "radial-gradient(ellipse at top, oklch(0.82 0.16 90 / 0.15), transparent 60%)"
        }} />
        <div className="mx-auto max-w-7xl px-6 py-24 text-center md:py-32">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-up animate-pulse" />
            Sistema online • Preços em tempo real
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            O jeito profissional de investir em <span className="text-primary">criptomoedas</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Wallet segura, investimentos com rendimento diário, staking e painel administrativo completo — tudo em uma plataforma.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" className="font-semibold">
                Começar agora <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth" search={{ mode: "login" }}>
              <Button size="lg" variant="outline">Já tenho conta</Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-surface p-4 text-left">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="mt-1 text-2xl font-bold">{s.value}</div>
                {s.change && <div className={`mt-1 text-xs ${s.up ? "text-up" : "text-down"}`}>{s.change}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Tudo o que você precisa</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">Ferramentas profissionais para você investir, acompanhar e crescer.</p>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="group rounded-xl border border-border bg-surface p-6 transition hover:border-primary/50 hover:bg-surface-elevated">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Pronto para começar?</h2>
          <p className="mt-3 text-muted-foreground">Crie sua conta em segundos. O primeiro usuário é automaticamente admin.</p>
          <div className="mt-8">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" className="font-semibold">Criar conta grátis</Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CryptoVault. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
