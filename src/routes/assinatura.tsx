import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SubscriptionPlanShowcase } from "@/components/subscription-plan-showcase";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/assinatura")({
  head: () => ({
    meta: [
      { title: "Assinatura — Meu Cronograma" },
      {
        name: "description",
        content:
          "Compare os planos Gratuito, Essencial e Premium com dados vindos direto do banco.",
      },
    ],
  }),
  component: AssinaturaPage,
});

function AssinaturaPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <SubscriptionPlanShowcase mode="page" />

      <section className="container mx-auto px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-card p-8 text-center md:p-12">
          <div className="absolute inset-0 bg-gradient-hero opacity-40" />
          <div className="relative">
            <h2 className="text-3xl font-black md:text-4xl">
              Seu proximo passo no cuidado capilar começa aqui
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Escolha o plano ideal agora e deixe o checkout para a proxima etapa. A pagina ja esta
              pronta para receber a integracao de pagamento sem retrabalho visual.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to={user ? "/cronograma" : "/auth"}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-8 py-3.5 font-bold text-primary-foreground shadow-glow transition-smooth hover:scale-105"
              >
                {user ? "Ir para meu cronograma" : "Criar conta e começar"}{" "}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={user ? "/minha-assinatura" : "/"}
                className="inline-flex items-center justify-center rounded-full border border-border bg-background/70 px-8 py-3.5 font-bold transition-smooth hover:border-primary hover:text-primary"
              >
                {user ? "Abrir Minha Assinatura" : "Voltar para o início"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
