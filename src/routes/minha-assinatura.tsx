import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CreditCard,
  Crown,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import {
  useBillingGateways,
} from "@/hooks/use-billing-gateways";
import {
  useCreateBillingCheckoutSessionIntent,
  useCreateBillingPortalActionIntent,
  useUserBillingSnapshot,
} from "@/hooks/use-billing-orchestration";
import {
  useProvisionUserSubscription,
  useUserSubscriptionSnapshot,
} from "@/hooks/use-user-subscriptions";
import { PRIMARY_BILLING_GATEWAY_KEY } from "@/types/billing";
import type { BillingCheckoutSessionRow, BillingInvoiceRow } from "@/types/billing";
import type { UserSubscriptionHistoryRow, UserSubscriptionStatus } from "@/types/subscriptions";

export const Route = createFileRoute("/minha-assinatura")({
  head: () => ({
    meta: [
      { title: "Minha Assinatura — Meu Cronograma" },
      {
        name: "description",
        content:
          "Acompanhe seu plano atual, proxima cobranca, historico e os proximos passos da sua assinatura.",
      },
    ],
  }),
  component: MinhaAssinaturaPage,
});

type PendingAction = "cancel" | "reactivate" | null;

const statusMeta: Record<
  UserSubscriptionStatus,
  { label: string; tone: "default" | "secondary" | "outline"; helper: string }
> = {
  draft: {
    label: "Rascunho",
    tone: "outline",
    helper: "Sua assinatura ainda esta sendo preparada.",
  },
  trialing: {
    label: "Teste gratis",
    tone: "secondary",
    helper: "Seu acesso esta ativo durante o periodo de teste.",
  },
  active: {
    label: "Ativa",
    tone: "default",
    helper: "Seu plano esta liberado e funcionando normalmente.",
  },
  past_due: {
    label: "Pagamento pendente",
    tone: "outline",
    helper: "Existe uma pendencia para renovar a assinatura.",
  },
  canceled: {
    label: "Cancelada",
    tone: "outline",
    helper: "A assinatura foi encerrada e pode ser reativada depois.",
  },
  expired: {
    label: "Expirada",
    tone: "outline",
    helper: "O periodo do plano terminou.",
  },
  incomplete: {
    label: "Incompleta",
    tone: "outline",
    helper: "A assinatura precisa de confirmacao para ficar ativa.",
  },
};

const historyEventLabels: Record<string, string> = {
  subscription_created: "Assinatura criada",
  subscription_updated: "Assinatura atualizada",
  migration_snapshot: "Historico importado",
};

const billingSessionStatusLabels: Record<string, string> = {
  draft: "Rascunho",
  pending: "Pendente",
  completed: "Concluida",
  expired: "Expirada",
  canceled: "Cancelada",
  failed: "Falhou",
};

const invoiceStatusLabels: Record<string, string> = {
  draft: "Rascunho",
  open: "Aberta",
  paid: "Paga",
  past_due: "Em atraso",
  void: "Cancelada",
  uncollectible: "Nao recuperavel",
  refunded: "Reembolsada",
  failed: "Falhou",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Nao definido";

  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Nao definido";

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTimeShort(value: string | null | undefined) {
  if (!value) return "Nao definido";

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Nao definido";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getDaysRemaining(value: string | null | undefined) {
  if (!value) return null;

  const now = new Date();
  const target = new Date(value);
  const diffInMs = target.getTime() - now.getTime();
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

  return diffInDays;
}

function getBillingLabel(interval: string | null | undefined) {
  if (interval === "annual") return "Anual";
  if (interval === "monthly") return "Mensal";
  return "Manual";
}

function getHistoryDescription(item: UserSubscriptionHistoryRow) {
  if (item.event_type === "subscription_created") {
    return "Entrada inicial do plano ou provisionamento automatico da conta.";
  }

  if (item.event_type === "subscription_updated") {
    return "Mudanca registrada para manter o estado da assinatura sincronizado.";
  }

  if (item.event_type === "migration_snapshot") {
    return "Registro criado para preservar o historico existente durante a migracao.";
  }

  return "Evento registrado no historico da assinatura.";
}

function getCheckoutSessionDescription(item: BillingCheckoutSessionRow) {
  if (item.action === "subscribe") {
    return "Tentativa de iniciar uma nova assinatura pelo checkout.";
  }

  if (item.action === "upgrade") {
    return "Tentativa de upgrade preparada para o plano superior.";
  }

  if (item.action === "downgrade") {
    return "Troca para um plano mais enxuto preparada para o checkout.";
  }

  if (item.action === "reactivate") {
    return "Reativacao preparada para retomar a cobranca e o acesso.";
  }

  return "Sessao de checkout registrada.";
}

function getInvoiceDescription(item: BillingInvoiceRow) {
  if (item.billing_reason === "subscription_create") {
    return "Fatura gerada na entrada de uma nova assinatura.";
  }

  if (item.billing_reason === "subscription_cycle") {
    return "Fatura referente ao ciclo recorrente da assinatura.";
  }

  if (item.billing_reason === "subscription_update") {
    return "Fatura gerada por upgrade, downgrade ou ajuste no plano.";
  }

  return "Registro financeiro preparado para a integracao do gateway.";
}

function MinhaAssinaturaPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const snapshotQuery = useUserSubscriptionSnapshot(user?.id);
  const billingSnapshotQuery = useUserBillingSnapshot(user?.id);
  const provisionMutation = useProvisionUserSubscription();
  const gatewayQuery = useBillingGateways();
  const prepareCheckoutMutation = useCreateBillingCheckoutSessionIntent();
  const prepareBillingActionMutation = useCreateBillingPortalActionIntent();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth" });
    }
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (!user || !snapshotQuery.isSuccess || provisionMutation.isPending || provisionMutation.isSuccess) {
      return;
    }

    if (!snapshotQuery.data?.currentSubscription && !snapshotQuery.data?.state) {
      provisionMutation.mutate();
    }
  }, [provisionMutation, snapshotQuery.data, snapshotQuery.isSuccess, provisionMutation.isPending, provisionMutation.isSuccess, user]);

  const snapshot = snapshotQuery.data;
  const currentPlan = snapshot?.currentPlan ?? null;
  const currentSubscription = snapshot?.currentSubscription ?? null;
  const state = snapshot?.state ?? null;
  const history = snapshot?.history ?? [];
  const billingSnapshot = billingSnapshotQuery.data;
  const checkoutSessions = billingSnapshot?.checkoutSessions ?? [];
  const invoices = billingSnapshot?.invoices ?? [];

  const currentStatus = (state?.status ??
    currentSubscription?.status ??
    "draft") as UserSubscriptionStatus;
  const statusInfo = statusMeta[currentStatus] ?? statusMeta.draft;
  const nextChargeAt = state?.due_at ?? currentSubscription?.due_at ?? currentSubscription?.current_period_ends_at;
  const startedAt = state?.started_at ?? currentSubscription?.started_at ?? currentSubscription?.created_at ?? null;
  const daysRemaining = getDaysRemaining(nextChargeAt);
  const autoRenew = state?.auto_renew ?? currentSubscription?.auto_renew ?? false;
  const trialEndsAt = state?.trial_ends_at ?? currentSubscription?.trial_ends_at ?? null;
  const trialUsed = state?.trial_used ?? currentSubscription?.trial_used ?? false;
  const billingLabel = getBillingLabel(currentSubscription?.billing_interval);
  const canCancel = ["trialing", "active", "past_due", "incomplete"].includes(currentStatus);
  const canReactivate = ["canceled", "expired"].includes(currentStatus);

  const summaryCards = useMemo(
    () => [
      {
        label: "Plano atual",
        value: currentPlan?.name ?? "Plano nao definido",
        helper: billingLabel,
        icon: Crown,
      },
      {
        label: "Proxima cobranca",
        value:
          currentPlan && (currentPlan.monthly_price > 0 || currentPlan.annual_price > 0)
            ? formatDate(nextChargeAt)
            : "Sem cobranca programada",
        helper:
          trialEndsAt && currentStatus === "trialing"
            ? `Teste ate ${formatDate(trialEndsAt)}`
            : statusInfo.helper,
        icon: CreditCard,
      },
      {
        label: "Dias restantes",
        value:
          daysRemaining === null
            ? "Sem prazo"
            : daysRemaining >= 0
              ? `${daysRemaining} dias`
              : "Periodo encerrado",
        helper: startedAt ? `Inicio em ${formatDate(startedAt)}` : "Aguardando definicao",
        icon: CalendarClock,
      },
      {
        label: "Status",
        value: statusInfo.label,
        helper: autoRenew ? "Renovacao automatica ativada" : "Renovacao automatica desativada",
        icon: ShieldCheck,
      },
    ],
    [
      autoRenew,
      billingLabel,
      currentPlan,
      currentStatus,
      daysRemaining,
      nextChargeAt,
      startedAt,
      statusInfo.helper,
      statusInfo.label,
      trialEndsAt,
    ],
  );

  const availableGateways = gatewayQuery.data ?? [];
  const primaryGateway = useMemo(
    () =>
      availableGateways.find((gateway) => gateway.key === PRIMARY_BILLING_GATEWAY_KEY) ??
      availableGateways[0] ??
      null,
    [availableGateways],
  );

  const handleAction = async (action: Exclude<PendingAction, null>) => {
    if (!user || !currentSubscription) {
      toast.error("Sua assinatura ainda nao possui dados suficientes para essa acao.");
      setPendingAction(null);
      return;
    }

    try {
      if (action === "cancel") {
        const preparedAction = await prepareBillingActionMutation.mutateAsync({
          gateway: PRIMARY_BILLING_GATEWAY_KEY,
          action: "cancel",
          customer: {
            userId: user.id,
            email: user.email ?? null,
            displayName: (user.user_metadata?.display_name as string | undefined) ?? null,
          },
          currentSubscription,
          returnUrl:
            typeof window !== "undefined" ? `${window.location.origin}/minha-assinatura` : undefined,
          metadata: {
            source: "minha-assinatura",
          },
        });

        toast.info(`${preparedAction.message} Gateway previsto: ${preparedAction.gateway.name}.`);
      }

      if (action === "reactivate" && currentPlan) {
        const preparedCheckout = await prepareCheckoutMutation.mutateAsync({
          gateway: PRIMARY_BILLING_GATEWAY_KEY,
          action: "reactivate",
          billingInterval: (currentSubscription.billing_interval ?? "monthly") as "monthly" | "annual",
          plan: currentPlan,
          customer: {
            userId: user.id,
            email: user.email ?? null,
            displayName: (user.user_metadata?.display_name as string | undefined) ?? null,
          },
          currentSubscription,
          successUrl:
            typeof window !== "undefined" ? `${window.location.origin}/minha-assinatura` : undefined,
          cancelUrl:
            typeof window !== "undefined" ? `${window.location.origin}/minha-assinatura` : undefined,
          metadata: {
            source: "minha-assinatura",
          },
        });

        toast.info(`${preparedCheckout.message} Gateway previsto: ${preparedCheckout.gateway.name}.`);
      }
    } catch (error) {
      console.error("[minha-assinatura] erro ao preparar acao de billing", error);
      toast.error("Nao foi possivel preparar essa acao agora.");
    } finally {
      setPendingAction(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-3xl border border-border bg-gradient-card p-8 text-center shadow-elegant">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h1 className="mt-4 text-2xl font-black">Carregando sua assinatura</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos validando sua conta para montar seu painel de assinatura.
            </p>
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
              <Sparkles className="h-3.5 w-3.5" /> Area do assinante
            </span>
            <h1 className="mt-4 text-4xl font-black md:text-5xl">
              Minha <span className="text-gradient">Assinatura</span>
            </h1>
            <p className="mt-3 text-muted-foreground">
              Acompanhe o plano atual, o status da assinatura e os proximos passos sem depender do
              checkout nesta etapa.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-full px-5 py-3 font-bold">
              <Link to="/assinatura">
                Comparar planos <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild className="rounded-full px-5 py-3 font-bold">
              <Link to="/cronograma">Voltar ao app</Link>
            </Button>
          </div>
        </div>

        {snapshotQuery.isLoading || provisionMutation.isPending ? (
          <div className="mt-10 flex items-center justify-center gap-3 rounded-3xl border border-border bg-gradient-card p-12 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Preparando os dados da sua assinatura...
          </div>
        ) : snapshotQuery.isError ? (
          <div className="mt-10 rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <XCircle className="mx-auto h-8 w-8 text-destructive" />
            <h2 className="mt-4 text-2xl font-black">Nao foi possivel carregar sua assinatura</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tente novamente em instantes. A estrutura da area esta pronta, mas a consulta falhou
              nesta tentativa.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-6 rounded-full px-6 py-3 font-bold"
              onClick={() => void snapshotQuery.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <div key={card.label} className="rounded-3xl border border-border bg-gradient-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{card.label}</div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <card.icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 text-2xl font-black">{card.value}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{card.helper}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-3xl border border-border bg-gradient-card p-6 md:p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-3xl font-black">
                        {currentPlan?.name ?? "Plano aguardando definicao"}
                      </h2>
                      <Badge variant={statusInfo.tone}>{statusInfo.label}</Badge>
                      {currentPlan?.badge ? <Badge variant="outline">{currentPlan.badge}</Badge> : null}
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {currentPlan?.description ??
                        "Sua conta ja esta preparada para trabalhar com planos e assinaturas."}
                    </p>
                  </div>

                  {currentPlan ? (
                    <div
                      className="rounded-3xl border px-5 py-4 text-center"
                      style={{
                        borderColor: `${currentPlan.color}55`,
                        backgroundColor: `${currentPlan.color}12`,
                      }}
                    >
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Plano atual
                      </div>
                      <div className="mt-2 text-lg font-black" style={{ color: currentPlan.color }}>
                        {currentPlan.name}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background/50 p-5">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Renovacao
                    </div>
                    <div className="mt-2 text-lg font-black">
                      {autoRenew ? "Automatica ativada" : "Automatica desativada"}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      O controle automatico de cobranca vai entrar quando integrarmos o checkout.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/50 p-5">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Historico de teste
                    </div>
                    <div className="mt-2 text-lg font-black">
                      {trialUsed ? "Teste ja utilizado" : "Teste disponivel ou em andamento"}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {trialEndsAt
                        ? `Periodo atual ate ${formatDate(trialEndsAt)}.`
                        : "Sem periodo de teste ativo neste momento."}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild className="rounded-full px-6 py-3 font-bold">
                    <Link to="/assinatura">
                      Upgrade <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>

                  <Button asChild variant="outline" className="rounded-full px-6 py-3 font-bold">
                    <Link to="/assinatura">Downgrade</Link>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full px-6 py-3 font-bold"
                    disabled={!canCancel || prepareBillingActionMutation.isPending}
                    onClick={() => setPendingAction("cancel")}
                  >
                    {prepareBillingActionMutation.isPending ? "Preparando..." : "Cancelar"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full px-6 py-3 font-bold"
                    disabled={!canReactivate || prepareCheckoutMutation.isPending}
                    onClick={() => setPendingAction("reactivate")}
                  >
                    {prepareCheckoutMutation.isPending ? "Preparando..." : "Reativar"}
                  </Button>
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  Os botoes ja estao preparados visualmente. A execucao real sera conectada ao fluxo
                  de pagamento nas proximas etapas.
                </p>
              </section>

              <aside className="rounded-3xl border border-border bg-gradient-card p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                    <RefreshCw className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="font-bold">Proximos passos</div>
                    <div className="text-xs text-muted-foreground">
                      Area preparada para ligacao com checkout
                    </div>
                  </div>
                </div>

                <ul className="mt-6 space-y-4">
                  {[
                    "Conectar upgrade e downgrade ao checkout",
                    "Sincronizar cancelamento e reativacao com o gateway",
                    "Registrar cobrancas reais no historico da assinatura",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                      </span>
                      <span className="leading-relaxed text-foreground/90">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5">
                  <div className="text-sm font-bold">Estado atual da integracao</div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    O backend ja guarda plano, status, vencimento, renovacao automatica e historico.
                    Agora a interface pessoal da assinatura tambem esta pronta para receber pagamento
                    sem retrabalho visual.
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-border bg-background/50 p-5">
                  <div className="text-sm font-bold">Gateway principal preparado</div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {primaryGateway
                      ? `${primaryGateway.name} foi definido como resolucao padrao, mas a camada de billing ja aceita troca futura de gateway sem alterar os componentes da assinatura.`
                      : "A camada generica de billing ja esta pronta para receber um gateway padrao."}
                  </p>
                </div>
              </aside>
            </div>

            <section className="mt-8 rounded-3xl border border-border bg-gradient-card p-6 md:p-8">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                    <CreditCard className="h-3.5 w-3.5" /> Gateways preparados
                  </div>
                  <h2 className="mt-4 text-3xl font-black">Arquitetura pronta para trocar de gateway</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    O checkout futuro podera ser ligado com Stripe, Mercado Pago, Asaas, PagSeguro,
                    Kirvano, Kiwify, Hotmart, Eduzz ou Monetizze usando os mesmos contratos.
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {availableGateways.length} gateways catalogados
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {availableGateways.map((gateway) => (
                  <div key={gateway.key} className="rounded-3xl border border-border bg-background/50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-black">{gateway.name}</div>
                      <Badge variant="outline">{gateway.statusLabel}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {gateway.description}
                    </p>
                    <div className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">
                      Capacidades
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {gateway.capabilities.map((capability) => (
                        <Badge key={capability} variant="secondary">
                          {capability}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-border bg-gradient-card p-6 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black">Tentativas de checkout</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Cada fluxo preparado fica salvo para integracao futura com confirmacao,
                      retorno do checkout e webhook.
                    </p>
                  </div>
                  <Badge variant="outline">
                    {checkoutSessions.length} {checkoutSessions.length === 1 ? "sessao" : "sessoes"}
                  </Badge>
                </div>

                {billingSnapshotQuery.isLoading ? (
                  <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-background/50 p-5 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando sessoes de checkout...
                  </div>
                ) : checkoutSessions.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    Nenhuma tentativa de checkout foi registrada ainda.
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {checkoutSessions.slice(0, 4).map((item) => (
                      <div key={item.id} className="rounded-2xl border border-border bg-background/50 p-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-lg font-black capitalize">{item.action}</div>
                              <Badge variant="secondary">
                                {billingSessionStatusLabels[item.status] ?? item.status}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                              {getCheckoutSessionDescription(item)}
                            </p>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDateTimeShort(item.created_at)}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-2xl border border-border bg-card/50 p-4">
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Gateway
                            </div>
                            <div className="mt-2 font-semibold capitalize">{item.gateway}</div>
                          </div>
                          <div className="rounded-2xl border border-border bg-card/50 p-4">
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Valor
                            </div>
                            <div className="mt-2 font-semibold">
                              {formatCurrency(item.amount_snapshot)}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-border bg-card/50 p-4">
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Intervalo
                            </div>
                            <div className="mt-2 font-semibold">
                              {item.billing_interval === "annual" ? "Anual" : "Mensal"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-border bg-gradient-card p-6 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black">Faturas</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      A estrutura de invoices ja esta preparada para registrar pagamento, falha,
                      renovacao, cancelamento e historico financeiro.
                    </p>
                  </div>
                  <Badge variant="outline">
                    {invoices.length} {invoices.length === 1 ? "fatura" : "faturas"}
                  </Badge>
                </div>

                {billingSnapshotQuery.isLoading ? (
                  <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-background/50 p-5 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando faturas...
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    As faturas vao aparecer aqui assim que o gateway real comecar a sincronizar os
                    cobrancas e webhooks.
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {invoices.slice(0, 4).map((item) => (
                      <div key={item.id} className="rounded-2xl border border-border bg-background/50 p-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-lg font-black">
                                {invoiceStatusLabels[item.status] ?? item.status}
                              </div>
                              <Badge variant="secondary">{item.billing_reason}</Badge>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                              {getInvoiceDescription(item)}
                            </p>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDateTimeShort(item.created_at)}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-2xl border border-border bg-card/50 p-4">
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Valor devido
                            </div>
                            <div className="mt-2 font-semibold">{formatCurrency(item.amount_due)}</div>
                          </div>
                          <div className="rounded-2xl border border-border bg-card/50 p-4">
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Valor pago
                            </div>
                            <div className="mt-2 font-semibold">{formatCurrency(item.amount_paid)}</div>
                          </div>
                          <div className="rounded-2xl border border-border bg-card/50 p-4">
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Vencimento
                            </div>
                            <div className="mt-2 font-semibold">{formatDate(item.due_at)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-border bg-gradient-card p-6 md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                    <History className="h-3.5 w-3.5" /> Historico
                  </div>
                  <h2 className="mt-4 text-3xl font-black">Movimentacoes da assinatura</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Toda alteracao relevante fica preparada para aparecer aqui.
                  </p>
                </div>

                <div className="text-sm text-muted-foreground">
                  {history.length} {history.length === 1 ? "evento registrado" : "eventos registrados"}
                </div>
              </div>

              {history.length === 0 ? (
                <div className="mt-6 rounded-3xl border border-dashed border-border p-10 text-center">
                  <History className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Nenhum evento foi registrado ainda para esta assinatura.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {history.map((item) => {
                    const itemStatus =
                      statusMeta[(item.status as UserSubscriptionStatus) ?? "draft"] ?? statusMeta.draft;

                    return (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-border bg-background/50 p-5"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-lg font-black">
                                {historyEventLabels[item.event_type] ?? item.event_type}
                              </div>
                              <Badge variant={itemStatus.tone}>{itemStatus.label}</Badge>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                              {getHistoryDescription(item)}
                            </p>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDateTime(item.created_at)}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-2xl border border-border bg-card/50 p-4">
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Inicio
                            </div>
                            <div className="mt-2 font-semibold">{formatDate(item.started_at)}</div>
                          </div>
                          <div className="rounded-2xl border border-border bg-card/50 p-4">
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Vencimento
                            </div>
                            <div className="mt-2 font-semibold">{formatDate(item.due_at)}</div>
                          </div>
                          <div className="rounded-2xl border border-border bg-card/50 p-4">
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Renovacao automatica
                            </div>
                            <div className="mt-2 font-semibold">
                              {item.auto_renew ? "Ativada" : "Desativada"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <AlertDialog open={pendingAction === "cancel"} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Preparar cancelamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O fluxo real de cancelamento ainda nao foi integrado ao pagamento. Nesta etapa, estamos
              deixando a experiencia pronta para receber a acao final.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleAction("cancel")}>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingAction === "reactivate"}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Preparar reativacao?</AlertDialogTitle>
            <AlertDialogDescription>
              A interface de reativacao ja esta pronta. Na integracao de checkout, esta acao podera
              religar a assinatura diretamente daqui.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleAction("reactivate")}>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
