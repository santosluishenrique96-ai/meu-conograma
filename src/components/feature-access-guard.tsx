import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Crown, Loader2, Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useFeatureAccess } from "@/hooks/use-subscription-permissions";

type FeatureAccessGuardProps = {
  featureKey: string;
  children: ReactNode;
  variant?: "page" | "section";
  title?: string;
  description?: string;
};

function GuardLoader({ variant }: { variant: "page" | "section" }) {
  return (
    <div
      className={`rounded-3xl border border-border bg-gradient-card text-center shadow-elegant ${
        variant === "page" ? "px-6 py-16 md:px-10 md:py-20" : "px-6 py-10"
      }`}
    >
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      <h2 className="mt-4 text-2xl font-black">Validando seu plano</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Estamos conferindo se este recurso faz parte da sua assinatura.
      </p>
    </div>
  );
}

function GuardFallback({
  variant,
  title,
  description,
  featureName,
  currentPlanName,
  recommendedPlanName,
  unauthenticated,
}: {
  variant: "page" | "section";
  title?: string;
  description?: string;
  featureName?: string | null;
  currentPlanName?: string | null;
  recommendedPlanName?: string | null;
  unauthenticated?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-card shadow-elegant ${
        variant === "page" ? "px-6 py-16 md:px-10 md:py-20" : "px-6 py-10"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.16),_transparent_55%)]" />
      <div className="relative mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-primary shadow-glow">
          {unauthenticated ? (
            <Lock className="h-8 w-8 text-primary-foreground" />
          ) : (
            <Crown className="h-8 w-8 text-primary-foreground" />
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Badge variant="secondary">
            {unauthenticated ? "Entre para continuar" : "Upgrade disponivel"}
          </Badge>
          {currentPlanName && <Badge variant="outline">Plano atual: {currentPlanName}</Badge>}
          {recommendedPlanName && !unauthenticated && (
            <Badge variant="outline">Sugestao: {recommendedPlanName}</Badge>
          )}
        </div>

        <h2 className="mt-5 text-3xl font-black md:text-4xl">
          {title || (unauthenticated ? "Entre na sua conta para continuar" : "Desbloqueie este recurso")}
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          {description ||
            (unauthenticated
              ? "Faça login para verificar seu plano e continuar de onde parou."
              : `${featureName || "Este recurso"} faz parte de um plano com acesso liberado. Escolha o plano ideal e continue sua jornada com tudo destravado.`)}
        </p>

        <div className="mt-8 grid gap-3 text-left md:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "Acesso imediato",
              text: `Libere ${featureName || "o recurso"} assim que o plano certo estiver ativo.`,
            },
            {
              icon: Crown,
              title: "Regras centralizadas",
              text: "Seu acesso respeita automaticamente as permissoes configuradas pelo admin.",
            },
            {
              icon: Lock,
              title: "Protecao real",
              text: "O bloqueio acontece tanto na interface quanto nas validacoes do Supabase.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-background/60 p-4">
              <item.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 text-sm font-bold">{item.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="rounded-full px-6 py-3 font-bold">
            <Link to={unauthenticated ? "/auth" : "/assinatura"}>
              {unauthenticated ? "Entrar agora" : "Ver planos e fazer upgrade"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          {!unauthenticated && (
            <Button asChild variant="outline" className="rounded-full px-6 py-3 font-bold">
              <Link to="/assinatura">Comparar planos</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FeatureAccessGuard({
  featureKey,
  children,
  variant = "section",
  title,
  description,
}: FeatureAccessGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const accessQuery = useFeatureAccess(featureKey, !authLoading && Boolean(user));

  if (authLoading || (user && accessQuery.isLoading)) {
    return <GuardLoader variant={variant} />;
  }

  if (!user) {
    return (
      <GuardFallback
        variant={variant}
        title={title}
        description={description}
        unauthenticated
      />
    );
  }

  if (!accessQuery.data?.hasAccess) {
    return (
      <GuardFallback
        variant={variant}
        title={title}
        description={description}
        featureName={accessQuery.data?.featureName}
        currentPlanName={accessQuery.data?.currentPlanName}
        recommendedPlanName={accessQuery.data?.recommendedPlanName}
      />
    );
  }

  return <>{children}</>;
}
