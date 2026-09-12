import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar,
  Droplet,
  Leaf,
  Wrench,
  Sparkles,
  Check,
  ArrowRight,
  TrendingUp,
  BookOpenCheck,
  Bell,
  Trophy,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import heroImg from "@/assets/hero-hair.jpg";
import {
  DEFAULT_SCHEDULE_PREFS,
  ScheduleFocus,
  SchedulePrefsShape,
} from "@/constants/schedule-defaults";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SubscriptionPlanShowcase } from "@/components/subscription-plan-showcase";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";
import { useDiaryEntriesInRange } from "@/hooks/use-diary";
import { useFeatureAccess } from "@/hooks/use-subscription-permissions";
import { supabase } from "@/integrations/supabase/client";
import {
  computeTreatmentPatterns,
  computeWeeklySummary,
} from "@/lib/diary-analysis";
import { toast } from "sonner";

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
    icon: Sparkles,
    title: "Dicas de Especialistas",
    desc: "Conteúdo exclusivo para potencializar seus resultados.",
  },
  {
    icon: Bell,
    title: "Lembretes Personalizados",
    desc: "Notificações no momento certo de cada etapa do seu cuidado.",
  },
  {
    icon: TrendingUp,
    title: "Evolução Visível",
    desc: "Acompanhe o progresso com fotos e métricas semana a semana.",
  },
  {
    icon: Trophy,
    title: "Gamificação",
    desc: "Ganhe conquistas e suba de nível mantendo sua rotina capilar.",
  },
];

const FOCUS_TYPES: Record<ScheduleFocus, { icon: LucideIcon; color: string; desc: string }> = {
  Hidratação: {
    icon: Droplet,
    color: "from-sky-400/90 to-cyan-500/90",
    desc: "Devolve água e maciez aos fios. Use cremes hidratantes, tônicos e finalizadores leves.",
  },
  Nutrição: {
    icon: Leaf,
    color: "from-emerald-400/90 to-teal-500/90",
    desc: "Repõe lipídios e brilho. Óleos vegetais, manteigas e cremes nutritivos são seus aliados.",
  },
  Reconstrução: {
    icon: Wrench,
    color: "from-amber-400/90 to-orange-500/90",
    desc: "Fortalece a fibra capilar. Queratinas, aminoácidos e proteínas restauram força e resistência.",
  },
  Descanso: {
    icon: Sparkles,
    color: "from-violet-400/90 to-purple-500/90",
    desc: "Deixe os fios respirarem. Use apenas finalização leve, co-wash ou proteção térmica.",
  },
  Cuidado: {
    icon: Sparkles,
    color: "from-fuchsia-400/90 to-pink-500/90",
    desc: "Dia versátil. Cuide com carinho: finalização, proteção UV e penteado sem calor.",
  },
};

function parseFocusType(value: string | null | undefined): ScheduleFocus {
  if (!value) return "Cuidado";
  return value in FOCUS_TYPES ? (value as ScheduleFocus) : "Cuidado";
}

const CIVIL_DATE_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function isCivilKey(raw: unknown): raw is string {
  return typeof raw === "string" && CIVIL_DATE_RE.test(raw);
}

function toCivilKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysLocal(date: Date, days: number): Date {
  const t = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  t.setDate(t.getDate() + days);
  return t;
}

function startOfWeekMonday(date: Date): Date {
  const weekday = date.getDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return addDaysLocal(date, delta);
}

const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

const MONTH_LABELS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

type Prefs = SchedulePrefsShape<string | null, ScheduleFocus>;

const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function Landing() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-3xl border border-border bg-gradient-card p-8 text-center shadow-elegant">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <h1 className="mt-4 text-2xl font-black">Preparando sua experiência</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos verificando sua sessão para carregar a página inicial.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPublic />;
  }

  return <HojeExperience />;
}

function LandingPublic() {
  const primaryCta = "/auth";
  return (
    <div className="min-h-screen">
      <SiteHeader />

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
                Começar grátis{" "}
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
              Criar minha conta grátis <ArrowRight className="h-4 w-4" />
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

function HojeExperience() {
  const { user } = useAuth();
  const customScheduleAccess = useFeatureAccess("cronograma-personalizado", Boolean(user));
  const canUseCustomSchedule = customScheduleAccess.data?.hasAccess ?? false;
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_SCHEDULE_PREFS);

  const todayLocal = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  }, []);
  const todayKey = toCivilKey(todayLocal);

  const weekdayIndex = todayLocal.getDay();
  const todayWeekdayKey = WEEKDAY_KEYS[weekdayIndex];
  const todayWeekdayLabel = WEEKDAY_LABELS[weekdayIndex];
  const todayMonthLabel = MONTH_LABELS[todayLocal.getMonth()];
  const todayDayLabel = `${todayWeekdayLabel}, ${todayLocal.getDate()} de ${todayMonthLabel}`;

  useEffect(() => {
    if (!user || !canUseCustomSchedule) return;
    let cancelled = false;
    supabase
      .from("schedule_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error("Erro ao carregar seu cronograma personalizado");
          return;
        }
        if (!data) return;
        setPrefs({
          hair_type: data.hair_type ?? null,
          goal: data.goal ?? null,
          monday: parseFocusType(data.monday),
          tuesday: parseFocusType(data.tuesday),
          wednesday: parseFocusType(data.wednesday),
          thursday: parseFocusType(data.thursday),
          friday: parseFocusType(data.friday),
          saturday: parseFocusType(data.saturday),
          sunday: parseFocusType(data.sunday),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [canUseCustomSchedule, user]);

  const mondayDate = startOfWeekMonday(todayLocal);
  const mondayKey = toCivilKey(mondayDate);

  const weekRange = useDiaryEntriesInRange(
    { from: mondayKey, to: todayKey },
    Boolean(user),
  );
  const { data: weekRows, status: weekStatus, refetch: refetchWeekRange, error: weekErrorRaw } = weekRange;

  const entriesByDate = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(weekRows)) {
      for (const row of weekRows) {
        const r = row as { entry_date?: unknown };
        if (isCivilKey(r.entry_date)) {
          set.add(r.entry_date);
        }
      }
    }
    return set;
  }, [weekRows]);

  const todayFocus = prefs[todayWeekdayKey] || "Cuidado";
  const focusMeta = FOCUS_TYPES[todayFocus] || FOCUS_TYPES.Cuidado;
  const FocusIcon = focusMeta.icon;

  const todayHasEntry = entriesByDate.has(todayKey);
  const registrationsCount = entriesByDate.size;
  const totalWeekDays = weekdayIndex === 0 ? 7 : weekdayIndex; // segunda=1 idx → 1 dia; domingo=0 idx → 7 dias
  const userName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "linda";
  const loadingWeek = weekStatus === "pending";
  const errorWeek = weekStatus === "error";

  const weekRowsSafe = Array.isArray(weekRows) ? weekRows : [];

  const weeklySummary = useMemo(
    () => computeWeeklySummary(weekRowsSafe, todayLocal),
    [weekRowsSafe, todayLocal],
  );
  const treatmentPatterns = useMemo(
    () => computeTreatmentPatterns(weekRowsSafe),
    [weekRowsSafe],
  );

  const firstEnoughPattern = treatmentPatterns.patterns.find((p) => p.hasEnoughData);

  const hasAnyEntry = weeklySummary.registeredDays > 0;
  const evaluatedCount = weeklySummary.perceived.evaluatedCount;
  const perceivedPositiveCount = weeklySummary.perceived.positive;

  const weekShortEmpty = !hasAnyEntry && !errorWeek && !loadingWeek;

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="container mx-auto px-4 py-12 md:py-16">
        <section className="mb-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <Calendar className="h-3.5 w-3.5" /> Hoje no cronograma
              </span>
              <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
                Olá, <span className="text-gradient">{userName}</span>. Vamos cuidar dos seus fios?
              </h1>
              <p className="mt-3 text-base text-muted-foreground md:text-lg">{todayDayLabel}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <article className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-card shadow-elegant">
            <div className="p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${focusMeta.color} px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-background shadow-md`}
                  >
                    <FocusIcon className="h-4 w-4" /> {todayFocus}
                  </div>
                  <h2 className="mt-5 text-2xl font-black md:text-4xl">
                    Hoje é dia de <span className="text-gradient">{todayFocus}</span>
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-foreground/90 md:text-base">
                    {focusMeta.desc}
                  </p>
                </div>

                <div className="flex flex-col gap-3 md:items-end">
                  {todayHasEntry ? (
                    <span className="inline-flex w-max items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-600">
                      <Check className="h-4 w-4" /> Registrado hoje
                    </span>
                  ) : (
                    <span className="inline-flex w-max items-center gap-1.5 rounded-full border border-border bg-card/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <BookOpenCheck className="h-3.5 w-3.5" /> Aguardando seu registro
                    </span>
                  )}

                  <Link
                    to="/diario"
                    search={{ date: todayKey }}
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-7 py-3 font-bold text-primary-foreground shadow-glow transition-smooth hover:scale-105"
                  >
                    {todayHasEntry ? "Ver registro de hoje" : "Registrar no Diário"}
                    <ArrowRight className="h-4 w-4 transition-smooth group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="border-t border-border/40 bg-background/40 p-6 md:p-8">
              <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Sua semana
                  </div>
                  <p className="mt-1 text-base font-semibold text-foreground md:text-lg">
                    {loadingWeek ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />{" "}
                        Carregando semana…
                      </span>
                    ) : (
                      <>
                        Você registrou <span className="text-gradient">{registrationsCount}</span>{" "}
                        de <span className="font-bold">{totalWeekDays}</span> dias desta semana.
                      </>
                    )}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Registre cada dia para acompanhar sua consistência e manter seu cabelo saudável.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to="/cronograma"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-5 py-2.5 text-sm font-bold transition-smooth hover:border-primary hover:text-primary"
                  >
                    Cronograma completo <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/evolucao"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-5 py-2.5 text-sm font-bold transition-smooth hover:border-primary hover:text-primary"
                  >
                    Evolução <TrendingUp className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </article>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-border bg-gradient-card p-6">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sobre sua rotina
              </div>
              <h3 className="mt-2 text-xl font-black">Foco do dia em 3 passos</h3>
              <ol className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/90">
                <li>
                  <strong className="text-foreground">1. Preparo:</strong> comece lavando com
                  shampoo adequado para seu tipo de cabelo.
                </li>
                <li>
                  <strong className="text-foreground">2. Tratamento:</strong> aplique o produto do
                  foco de hoje e deixe aguardar o tempo recomendado.
                </li>
                <li>
                  <strong className="text-foreground">3. Registro:</strong> finalize o cuidado e
                  registre sua percepção no Diário.
                </li>
              </ol>
            </div>

            <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6">
              <div className="text-xs font-bold uppercase tracking-wider text-primary">
                Dica rápida
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                Registre mesmo nos dias de {`"Descanso"`}: consistência no cuidado ajuda você a
                entender o que melhor funciona para os seus fios.
              </p>
            </div>
          </aside>
        </section>

        <section className="mt-10">
          {errorWeek ? (
            <Alert variant="destructive" className="border-destructive/40 bg-destructive/5">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertTitle>Não foi possível carregar seu resumo agora.</AlertTitle>
              <AlertDescription className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-sm">A experiência principal de hoje continua disponível.</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => refetchWeekRange()}
                >
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {loadingWeek ? (
            <Card className="border-border bg-gradient-card">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-8 w-72" />
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Skeleton className="h-9 w-44 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {!loadingWeek && !errorWeek ? (
            <Card className="border-border bg-gradient-card shadow-elegant">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-full border-primary/30 bg-primary/5 text-foreground"
                  >
                    <BarChart3 className="mr-1.5 h-3 w-3 text-primary" />
                    Seu progresso nesta semana
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {weekShortEmpty ? (
                  <div className="space-y-4">
                    <CardTitle className="text-xl font-black leading-tight">
                      Comece a acompanhar sua semana
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Registre seus cuidados no Diário para acompanhar seus padrões ao longo do
                      tempo.
                    </CardDescription>
                    <div className="pt-2">
                      <Link
                        to="/diario"
                        search={{ date: todayKey }}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition-smooth hover:scale-105"
                      >
                        <Sparkles className="h-4 w-4" /> Registrar hoje
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <CardTitle className="text-xl font-black leading-tight">
                      Você registrou{" "}
                      <span className="text-gradient">{weeklySummary.registeredDays}</span> de{" "}
                      <span className="font-bold">{weeklySummary.elapsedDays}</span> dias desta
                      semana.
                    </CardTitle>

                    {evaluatedCount > 0 ? (
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        Em <span className="font-bold">{perceivedPositiveCount}</span> de{" "}
                        <span className="font-bold">{evaluatedCount}</span> registros avaliados,
                        a resposta foi Bom ou Muito bom.
                      </p>
                    ) : null}

                    {firstEnoughPattern ? (
                      <div className="rounded-2xl border border-border bg-card/70 p-4">
                        <p className="text-sm text-foreground/90 leading-relaxed">
                          Em registros com{" "}
                          <span className="font-black">{firstEnoughPattern.treatment}</span>,{" "}
                          <span className="font-bold">
                            {firstEnoughPattern.positiveCount}
                          </span>{" "}
                          de{" "}
                          <span className="font-bold">
                            {firstEnoughPattern.evaluatedPerceivedCount}
                          </span>{" "}
                          avaliações foram Bom ou Muito bom.
                        </p>
                      </div>
                    ) : null}

                    <div className="pt-2">
                      <Link
                        to="/diario"
                        search={{ date: todayKey }}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card/70 px-5 py-2 text-sm font-bold transition-smooth hover:border-primary hover:text-primary"
                      >
                        Ver resumo completo <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </section>
      </main>

      <footer className="border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Meu Cronograma · Feito com amor para cabelos lindos.
      </footer>
    </div>
  );
}
