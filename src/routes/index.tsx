import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar,
  Droplet,
  Sparkles,
  TrendingUp,
  Bell,
  Trophy,
  ArrowRight,
  House,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import heroImg from "@/assets/hero-hair.jpg";
import { SubscriptionPlanShowcase } from "@/components/subscription-plan-showcase";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meu Cronograma — Cabelos lindos e saudáveis todos os dias" },
      {
        name: "description",
        content:
          "Cronograma capilar diário, semanal e mensal com dicas profissionais. Hidratação, nutrição e reconstrução no momento certo.",
      },
      { property: "og:title", content: "Meu Cronograma Capilar" },
      {
        property: "og:description",
        content: "Transforme seus cabelos com um cronograma personalizado.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Calendar,
    title: "Cronograma Inteligente",
    desc: "Planos diários, semanais e mensais ajustados ao seu tipo de cabelo.",
  },
  {
    icon: Droplet,
    title: "Hidratação · Nutrição · Reconstrução",
    desc: "A tríade perfeita organizada para você nunca errar a ordem.",
  },
  {
    icon: Bell,
    title: "Lembretes Personalizados",
    desc: "Notificações no momento certo de cada etapa do seu cuidado.",
  },
  {
    icon: Trophy,
    title: "Gamificação",
    desc: "Ganhe conquistas e suba de nível mantendo sua rotina capilar.",
  },
  {
    icon: TrendingUp,
    title: "Evolução Visível",
    desc: "Acompanhe o progresso com fotos e métricas semana a semana.",
  },
  {
    icon: Sparkles,
    title: "Dicas de Especialistas",
    desc: "Conteúdo exclusivo para potencializar seus resultados.",
  },
];

const quickLinks = [
  {
    to: "/",
    title: "Início",
    desc: "Volte para a visão geral e novidades do app.",
    icon: House,
  },
  {
    to: "/produtos",
    title: "Produtos",
    desc: "Veja os kits e ofertas para seu cronograma capilar.",
    icon: ShoppingBag,
  },
  {
    to: "/cronograma",
    title: "Cronograma",
    desc: "Acompanhe sua rotina diária, semanal e mensal.",
    icon: Calendar,
  },
  {
    to: "/evolucao",
    title: "Evolução",
    desc: "Salve fotos e acompanhe seus resultados.",
    icon: TrendingUp,
  },
];

function Landing() {
  const { user } = useAuth();
  const primaryCta = user ? "/cronograma" : "/auth";
  const userName = user?.user_metadata?.display_name || user?.email?.split("@")[0];

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="container relative mx-auto grid items-center gap-12 px-4 py-20 md:grid-cols-2 md:py-32">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Cronograma Capilar Inteligente
            </span>
            <h1 className="text-4xl font-black leading-[1.05] sm:text-5xl md:text-7xl">
              Cabelos <span className="text-gradient">lindos e saudáveis</span> todos os dias.
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg">
              Hidratação, nutrição e reconstrução no tempo certo. Um cronograma personalizado para
              mulheres que amam seus fios.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Link
                to={primaryCta}
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-primary px-7 py-3.5 font-bold text-primary-foreground shadow-glow transition-smooth hover:scale-105"
              >
                {user ? "Ver meu cronograma" : "Começar grátis"}{" "}
                <ArrowRight className="h-4 w-4 transition-smooth group-hover:translate-x-1" />
              </Link>
              <Link
                to="/assinatura"
                className="inline-flex items-center justify-center rounded-full border border-border bg-card/50 px-7 py-3.5 font-bold backdrop-blur transition-smooth hover:bg-card"
              >
                Ver planos
              </Link>
            </div>
            <div className="flex flex-col gap-4 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-6">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-background bg-gradient-primary"
                  />
                ))}
              </div>
              <span>
                <strong className="text-foreground">+10 mil</strong> mulheres já transformaram seus
                cabelos
              </span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-primary opacity-30 blur-3xl rounded-full" />
            <img
              src={heroImg}
              alt="Mulher com cabelos longos e saudáveis"
              width={1536}
              height={1024}
              className="relative rounded-3xl border border-primary/20 shadow-elegant"
            />
          </div>
        </div>
      </section>

      {user && (
        <section className="container mx-auto px-4 pt-4 pb-8 md:pb-12">
          <div className="rounded-3xl border border-primary/20 bg-gradient-card p-6 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                  <UserRound className="h-3.5 w-3.5" /> Menu da usuária
                </span>
                <h2 className="mt-4 text-3xl font-black md:text-4xl">
                  Olá, <span className="text-gradient">{userName}</span>
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Aqui estão todas as páginas principais para você navegar com rapidez pelo seu
                  espaço.
                </p>
              </div>
              <Link
                to="/produtos"
                search={{ focus: undefined }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-5 py-3 text-sm font-bold transition-smooth hover:border-primary hover:text-primary"
              >
                Ver produtos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {quickLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group rounded-3xl border border-border bg-background/60 p-5 transition-smooth hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                    <item.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    Abrir página{" "}
                    <ArrowRight className="h-4 w-4 transition-smooth group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FEATURES */}
      <section id="recursos" className="section-anchor container mx-auto px-4 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-black">
            Tudo que seu cabelo precisa em <span className="text-gradient">um só lugar</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Ferramentas profissionais para uma rotina capilar impecável.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-3xl bg-gradient-card border border-border p-7 transition-smooth hover:border-primary/50 hover:shadow-glow hover:-translate-y-1"
            >
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="planos" className="section-anchor">
        <SubscriptionPlanShowcase mode="preview" />
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-card border border-primary/30 p-12 md:p-16 text-center">
          <div className="absolute inset-0 bg-gradient-hero opacity-60" />
          <div className="relative">
            <h2 className="text-4xl md:text-5xl font-black max-w-2xl mx-auto">
              Pronta para ter o cabelo dos seus sonhos?
            </h2>
            <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
              Comece hoje mesmo. Seu cabelo merece o melhor cuidado.
            </p>
            <Link
              to={primaryCta}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-8 py-4 font-bold text-primary-foreground shadow-glow transition-smooth hover:scale-105"
            >
              {user ? "Ir para meu cronograma" : "Criar minha conta grátis"}{" "}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Meu Cronograma · Feito com amor para cabelos lindos.
      </footer>
    </div>
  );
}
