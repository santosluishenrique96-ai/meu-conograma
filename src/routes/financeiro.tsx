import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  ArrowLeft,
  BarChart3,
  Crown,
  Gem,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { SiteHeader } from "@/components/SiteHeader";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useStoreAdmin } from "@/hooks/use-store-admin";
import { useSubscriptionFinancialDashboard } from "@/hooks/use-subscription-financial-dashboard";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Dashboard Financeiro — Meu Cronograma" },
      {
        name: "description",
        content:
          "Acompanhe receita recorrente, conversoes, cancelamentos e a distribuicao dos planos em um painel administrativo.",
      },
    ],
  }),
  component: FinanceiroPage,
});

const statusColors = ["#8B5CF6", "#0EA5E9", "#10B981", "#F59E0B", "#F97316", "#64748B", "#EC4899"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FinanceiroPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useStoreAdmin();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth" });
    }
  }, [authLoading, navigate, user]);

  const dashboardQuery = useSubscriptionFinancialDashboard(Boolean(user) && isAdmin);
  const dashboard = dashboardQuery.data;

  const overviewCards = useMemo(() => {
    if (!dashboard) return [];

    return [
      {
        label: "Receita mensal",
        value: formatCurrency(dashboard.monthlyRecurringRevenue),
        helper: "MRR estimado com base nas assinaturas pagas ativas.",
        icon: Wallet,
      },
      {
        label: "Receita anual",
        value: formatCurrency(dashboard.annualRecurringRevenue),
        helper: "ARR projetado a partir da recorrencia mensal atual.",
        icon: TrendingUp,
      },
      {
        label: "Quantidade de assinantes",
        value: formatCompactNumber(dashboard.subscriberCount),
        helper: "Total de usuarios com assinatura provisionada no SaaS.",
        icon: Users,
      },
      {
        label: "Ticket medio",
        value: formatCurrency(dashboard.averageTicket),
        helper: "Media mensal por assinante pagante.",
        icon: BarChart3,
      },
      {
        label: "Cancelamentos",
        value: formatCompactNumber(dashboard.cancellationsCount),
        helper: "Assinaturas atualmente canceladas ou expiradas.",
        icon: TrendingDown,
      },
      {
        label: "Renovacoes",
        value: formatCompactNumber(dashboard.renewalsCount),
        helper: "Soma das renovacoes registradas no estado atual.",
        icon: RefreshCw,
      },
      {
        label: "Conversoes",
        value: formatCompactNumber(dashboard.conversionsCount),
        helper: "Usuarios que ja sairam do trial para um plano pago.",
        icon: Sparkles,
      },
      {
        label: "Teste gratis ativos",
        value: formatCompactNumber(dashboard.activeTrialsCount),
        helper: "Assinaturas em periodo de trial neste momento.",
        icon: ShieldCheck,
      },
    ];
  }, [dashboard]);

  const planHighlightCards = useMemo(() => {
    if (!dashboard) return [];

    return [
      {
        label: "Plano Gratuito",
        value: dashboard.freePlanSubscribers,
        color: "#64748B",
        icon: Sparkles,
      },
      {
        label: "Plano Essencial",
        value: dashboard.essentialPlanSubscribers,
        color: "#0EA5E9",
        icon: ShieldCheck,
      },
      {
        label: "Plano Premium",
        value: dashboard.premiumPlanSubscribers,
        color: "#8B5CF6",
        icon: Crown,
      },
    ];
  }, [dashboard]);

  const statusChartData = useMemo(
    () =>
      (dashboard?.statusBreakdown ?? [])
        .filter((item) => item.count > 0)
        .map((item, index) => ({
          ...item,
          fill: statusColors[index % statusColors.length],
        })),
    [dashboard],
  );

  const activityChartConfig = {
    newSubscriptions: {
      label: "Novas assinaturas",
      color: "#8B5CF6",
    },
    conversions: {
      label: "Conversoes",
      color: "#10B981",
    },
    cancellations: {
      label: "Cancelamentos",
      color: "#F97316",
    },
  } satisfies ChartConfig;

  const planChartConfig = {
    subscribers: {
      label: "Assinantes",
      color: "#0EA5E9",
    },
  } satisfies ChartConfig;

  const statusChartConfig = useMemo(
    () =>
      statusChartData.reduce<ChartConfig>((config, item) => {
        config[item.status] = {
          label: item.label,
          color: item.fill,
        };
        return config;
      }, {}),
    [statusChartData],
  );

  if (authLoading || adminLoading || !user) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
          <div className="rounded-3xl border border-border bg-card/60 px-8 py-12 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <h1 className="mt-4 text-2xl font-black">Carregando dashboard financeiro</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos validando seu acesso ao painel administrativo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl rounded-[32px] border border-border bg-gradient-card p-8 text-center md:p-10">
            <Badge variant="secondary" className="rounded-full px-4 py-1.5">
              Area restrita
            </Badge>
            <h1 className="mt-5 text-3xl font-black md:text-4xl">
              Este dashboard e exclusivo da administracao
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Apenas administradores podem acompanhar a performance financeira e a saude das
              assinaturas.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background/70 px-5 py-3 text-sm font-bold transition-smooth hover:border-primary hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar para o inicio
              </Link>
              <Link
                to="/planos"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow transition-smooth"
              >
                <Sparkles className="h-4 w-4" /> Abrir painel de planos
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Gem className="h-3.5 w-3.5" /> Dashboard Financeiro
            </span>
            <h1 className="mt-4 text-4xl font-black md:text-5xl">
              Visao financeira <span className="text-gradient">das assinaturas</span>
            </h1>
            <p className="mt-3 text-muted-foreground">
              Receita recorrente, conversoes, cancelamentos e distribuicao dos planos em uma
              leitura unica para a administracao.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/produtos"
              search={{ focus: undefined }}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background/70 px-5 py-3 text-sm font-bold transition-smooth hover:border-primary hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> Produtos
            </Link>
            <Link
              to="/planos"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background/70 px-5 py-3 text-sm font-bold transition-smooth hover:border-primary hover:text-primary"
            >
              <Sparkles className="h-4 w-4" /> Planos
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={() => dashboardQuery.refetch()}
              disabled={dashboardQuery.isFetching}
              className="rounded-full px-5 py-3 font-bold"
            >
              <RefreshCw className={`h-4 w-4 ${dashboardQuery.isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="outline" className="rounded-full px-4 py-1.5">
            Dados vindos do banco
          </Badge>
          <Badge variant="outline" className="rounded-full px-4 py-1.5">
            Atualizado em {dashboard ? formatDateTime(dashboard.generatedAt) : "--"}
          </Badge>
        </div>

        {dashboardQuery.isLoading ? (
          <div className="mt-10 rounded-[32px] border border-border bg-gradient-card p-10 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h2 className="mt-4 text-2xl font-black">Carregando indicadores</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos consolidando os dados de planos, assinaturas e historico.
            </p>
          </div>
        ) : dashboardQuery.isError || !dashboard ? (
          <div className="mt-10 rounded-[32px] border border-destructive/20 bg-destructive/5 p-10 text-center">
            <h2 className="text-2xl font-black">Nao foi possivel carregar o dashboard</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Confira se o usuario atual ainda possui acesso administrativo e tente recarregar a
              pagina.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {overviewCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div key={card.label} className="rounded-3xl border border-border bg-gradient-card p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm text-muted-foreground">{card.label}</div>
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-black">{card.value}</div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {card.helper}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {planHighlightCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div key={card.label} className="rounded-3xl border border-border bg-card/70 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">{card.label}</div>
                        <div className="mt-2 text-3xl font-black">{card.value}</div>
                      </div>
                      <div
                        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border"
                        style={{ borderColor: `${card.color}33`, backgroundColor: `${card.color}18`, color: card.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <section className="rounded-[32px] border border-border bg-gradient-card p-4 md:p-6">
                <div className="mb-5 flex flex-col gap-2">
                  <h2 className="text-2xl font-black">Movimento dos ultimos 6 meses</h2>
                  <p className="text-sm text-muted-foreground">
                    Acompanhe a entrada de novas assinaturas, conversoes e cancelamentos por mes.
                  </p>
                </div>

                <ChartContainer config={activityChartConfig} className="h-[320px] w-full">
                  <AreaChart data={dashboard.growthSeries}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                    <Area
                      type="monotone"
                      dataKey="newSubscriptions"
                      stroke="var(--color-newSubscriptions)"
                      fill="var(--color-newSubscriptions)"
                      fillOpacity={0.16}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="conversions"
                      stroke="var(--color-conversions)"
                      fill="var(--color-conversions)"
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="cancellations"
                      stroke="var(--color-cancellations)"
                      fill="var(--color-cancellations)"
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </section>

              <section className="rounded-[32px] border border-border bg-gradient-card p-4 md:p-6">
                <div className="mb-5 flex flex-col gap-2">
                  <h2 className="text-2xl font-black">Status das assinaturas</h2>
                  <p className="text-sm text-muted-foreground">
                    Visao atual da carteira entre trial, ativos, pendencias e cancelamentos.
                  </p>
                </div>

                {statusChartData.length === 0 ? (
                  <div className="flex h-[320px] items-center justify-center rounded-3xl border border-dashed border-border text-sm text-muted-foreground">
                    Ainda nao existem assinaturas suficientes para montar o grafico.
                  </div>
                ) : (
                  <ChartContainer config={statusChartConfig} className="h-[320px] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
                      <Pie
                        data={statusChartData}
                        dataKey="count"
                        nameKey="status"
                        innerRadius={72}
                        outerRadius={110}
                        paddingAngle={3}
                      >
                        {statusChartData.map((item) => (
                          <Cell key={item.status} fill={item.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                )}

                <div className="mt-4 grid gap-3">
                  {statusChartData.map((item) => (
                    <div key={item.status} className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <span className="text-sm font-black">{item.count}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <section className="rounded-[32px] border border-border bg-gradient-card p-4 md:p-6">
                <div className="mb-5 flex flex-col gap-2">
                  <h2 className="text-2xl font-black">Distribuicao por plano</h2>
                  <p className="text-sm text-muted-foreground">
                    Compare a base de assinantes de cada plano cadastrado no admin.
                  </p>
                </div>

                <ChartContainer config={planChartConfig} className="h-[320px] w-full">
                  <BarChart data={dashboard.planBreakdown}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="planName" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="subscribers" radius={[18, 18, 0, 0]} fill="var(--color-subscribers)" />
                  </BarChart>
                </ChartContainer>
              </section>

              <section className="rounded-[32px] border border-border bg-gradient-card p-4 md:p-6">
                <div className="mb-5 flex flex-col gap-2">
                  <h2 className="text-2xl font-black">Receita por plano</h2>
                  <p className="text-sm text-muted-foreground">
                    Estimativa atual da receita recorrente gerada por cada plano.
                  </p>
                </div>

                <div className="grid gap-3">
                  {dashboard.planBreakdown.map((plan) => (
                    <div key={plan.planId} className="rounded-3xl border border-border/70 bg-background/60 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: plan.color }} />
                          <div>
                            <div className="font-bold">{plan.planName}</div>
                            <div className="text-xs text-muted-foreground">
                              {plan.subscribers} assinantes, {plan.trialSubscribers} em trial
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="rounded-full">
                          {plan.payingSubscribers} pagantes
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border/60 bg-card/70 px-4 py-3">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Receita mensal
                          </div>
                          <div className="mt-1 text-lg font-black">
                            {formatCurrency(plan.monthlyRecurringRevenue)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card/70 px-4 py-3">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Receita anual
                          </div>
                          <div className="mt-1 text-lg font-black">
                            {formatCurrency(plan.annualRecurringRevenue)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
