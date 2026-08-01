import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useCreateBillingCheckoutSessionIntent } from "@/hooks/use-billing-orchestration";
import { usePublicPlanCatalog } from "@/hooks/use-subscription-plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRIMARY_BILLING_GATEWAY_KEY } from "@/types/billing";
import type { SubscriptionPlanCatalogItem } from "@/types/subscriptions";

type BillingMode = "monthly" | "annual";

type SubscriptionPlanShowcaseProps = {
  mode?: "preview" | "page";
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getPlanPriceLabel(
  mode: BillingMode,
  monthlyPrice: number,
  annualPrice: number,
  promotionalPrice: number | null,
) {
  if (mode === "annual") {
    if (annualPrice <= 0) {
      return {
        current: "Grátis",
        previous: null,
        suffix: "por ano",
      };
    }

    return {
      current: formatCurrency(annualPrice),
      previous: null,
      suffix: "por ano",
    };
  }

  if (promotionalPrice !== null && promotionalPrice >= 0 && promotionalPrice < monthlyPrice) {
    return {
      current: promotionalPrice === 0 ? "Grátis" : formatCurrency(promotionalPrice),
      previous: monthlyPrice > 0 ? formatCurrency(monthlyPrice) : null,
      suffix: "por mês",
    };
  }

  if (monthlyPrice <= 0) {
    return {
      current: "Grátis",
      previous: null,
      suffix: "para sempre",
    };
  }

  return {
    current: formatCurrency(monthlyPrice),
    previous: null,
    suffix: "por mês",
  };
}

export function SubscriptionPlanShowcase({
  mode = "page",
}: SubscriptionPlanShowcaseProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const catalogQuery = usePublicPlanCatalog();
  const [billingMode, setBillingMode] = useState<BillingMode>("monthly");
  const prepareCheckoutMutation = useCreateBillingCheckoutSessionIntent();

  const plans = useMemo(() => catalogQuery.data ?? [], [catalogQuery.data]);

  const handleSubscribe = async (plan: SubscriptionPlanCatalogItem) => {
    if (!user) {
      toast.info(`Entre na sua conta para continuar com o plano ${plan.name}`);
      navigate({ to: "/auth" });
      return;
    }

    try {
      const session = await prepareCheckoutMutation.mutateAsync({
        gateway: PRIMARY_BILLING_GATEWAY_KEY,
        action: "subscribe",
        billingInterval: billingMode,
        plan,
        customer: {
          userId: user.id,
          email: user.email ?? null,
          displayName: (user.user_metadata?.display_name as string | undefined) ?? null,
        },
        successUrl: typeof window !== "undefined" ? `${window.location.origin}/minha-assinatura` : undefined,
        cancelUrl: typeof window !== "undefined" ? `${window.location.origin}/assinatura` : undefined,
        metadata: {
          source: mode,
        },
      });

      toast.info(`${session.message} Gateway previsto: ${session.gateway.name}.`);
    } catch (error) {
      console.error("[subscription-plan-showcase] erro ao preparar checkout", error);
      toast.error("Nao foi possivel preparar o checkout deste plano agora.");
    }
  };

  const maxBenefits = mode === "preview" ? 4 : 8;

  return (
    <section className={mode === "page" ? "relative overflow-hidden" : ""}>
      {mode === "page" && (
        <>
          <div className="absolute inset-0 bg-gradient-hero opacity-60" />
          <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.22),_transparent_55%)]" />
        </>
      )}

      <div className={`container relative mx-auto px-4 ${mode === "page" ? "py-16 md:py-24" : ""}`}>
        <div className={`mx-auto ${mode === "page" ? "max-w-6xl" : "max-w-5xl"}`}>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              Assinaturas do Meu Cronograma
            </span>
            <h2 className={`mt-4 font-black ${mode === "page" ? "text-4xl md:text-6xl" : "text-4xl md:text-5xl"}`}>
              Planos com visual premium e dados <span className="text-gradient">100% do banco</span>
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Escolha entre Gratuito, Essencial e Premium com uma vitrine moderna, responsiva e
              pronta para receber o checkout na proxima etapa.
            </p>
          </div>

          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-full border border-border bg-background/70 p-1 shadow-sm backdrop-blur">
              <button
                type="button"
                onClick={() => setBillingMode("monthly")}
                className={`rounded-full px-5 py-2 text-sm font-bold transition-smooth ${billingMode === "monthly" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setBillingMode("annual")}
                className={`rounded-full px-5 py-2 text-sm font-bold transition-smooth ${billingMode === "annual" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
              >
                Anual
              </button>
            </div>
          </div>

          {mode === "page" && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <span>Stripe-inspired</span>
              <span>Notion-inspired</span>
              <span>Canva-inspired</span>
              <span>Spotify-inspired</span>
              <span>Netflix-inspired</span>
            </div>
          )}

          {catalogQuery.isLoading ? (
            <div className="mt-12 flex items-center justify-center gap-3 rounded-3xl border border-border bg-gradient-card p-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando planos do banco...
            </div>
          ) : plans.length === 0 ? (
            <div className="mt-12 rounded-3xl border border-dashed border-border bg-gradient-card p-12 text-center">
              <h3 className="text-2xl font-black">Nenhum plano publicado ainda</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Assim que os planos ativos forem cadastrados no painel, eles aparecem aqui
                automaticamente.
              </p>
            </div>
          ) : (
            <div className={`mt-12 grid gap-6 ${mode === "page" ? "lg:grid-cols-3" : "md:grid-cols-3"}`}>
              {plans.map((plan) => {
                const price = getPlanPriceLabel(
                  billingMode,
                  plan.monthly_price,
                  plan.annual_price,
                  plan.promotional_price,
                );
                const isHighlighted =
                  plan.slug === "premium" ||
                  (plan.badge ?? "").toLowerCase().includes("popular") ||
                  (plan.badge ?? "").toLowerCase().includes("top");

                return (
                  <article
                    key={plan.id}
                    className={`relative flex h-full flex-col overflow-hidden rounded-[2rem] border bg-background/70 p-6 backdrop-blur-xl transition-smooth hover:-translate-y-1 hover:shadow-glow ${isHighlighted ? "border-primary shadow-elegant" : "border-border"}`}
                    style={{
                      boxShadow: isHighlighted
                        ? `0 20px 60px ${plan.color}22`
                        : undefined,
                    }}
                  >
                    <div
                      className="absolute inset-x-0 top-0 h-32 opacity-80"
                      style={{
                        background: `linear-gradient(180deg, ${plan.color}26 0%, transparent 100%)`,
                      }}
                    />

                    <div className="relative flex h-full flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div
                            className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                            style={{
                              borderColor: `${plan.color}55`,
                              backgroundColor: `${plan.color}18`,
                              color: plan.color,
                            }}
                          >
                            {plan.name}
                          </div>
                          <h3 className="mt-4 text-3xl font-black">{plan.name}</h3>
                          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                            {plan.description}
                          </p>
                        </div>

                        {plan.badge && (
                          <Badge
                            className="border-0"
                            style={{
                              backgroundColor: plan.color,
                              color: "#fff",
                            }}
                          >
                            {plan.badge}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-8">
                        {price.previous && (
                          <div className="text-sm text-muted-foreground line-through">
                            {price.previous}
                          </div>
                        )}
                        <div className="flex items-end gap-2">
                          <span className="text-4xl font-black md:text-5xl">{price.current}</span>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{price.suffix}</div>
                        {billingMode === "annual" && plan.monthly_price > 0 && plan.annual_price > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Equivale a aproximadamente {formatCurrency(plan.annual_price / 12)} por mes
                          </div>
                        )}
                      </div>

                      <ul className="mt-8 space-y-3">
                        {plan.benefits.slice(0, maxBenefits).map((benefit) => (
                          <li key={benefit.id} className="flex items-start gap-3 text-sm">
                            <span
                              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                              style={{ backgroundColor: `${plan.color}20` }}
                            >
                              <Check className="h-3.5 w-3.5" style={{ color: plan.color }} />
                            </span>
                            <span>{benefit.name}</span>
                          </li>
                        ))}
                      </ul>

                      {plan.benefits.length > maxBenefits && (
                        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          +{plan.benefits.length - maxBenefits} beneficios adicionais
                        </div>
                      )}

                      <div className="mt-8 flex-1" />

                      <Button
                        type="button"
                        onClick={() => void handleSubscribe(plan)}
                        disabled={prepareCheckoutMutation.isPending}
                        className="mt-8 h-12 rounded-full text-sm font-bold text-primary-foreground shadow-glow"
                        style={{
                          background: `linear-gradient(135deg, ${plan.color} 0%, ${plan.color}CC 100%)`,
                        }}
                      >
                        {prepareCheckoutMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Preparando checkout
                          </>
                        ) : (
                          <>
                            {plan.button_text || "Assinar"} <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {mode === "preview" && plans.length > 0 && (
            <div className="mt-10 text-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/assinatura" })}
                className="rounded-full px-6 py-3 font-bold"
              >
                Ver página completa de assinatura <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
