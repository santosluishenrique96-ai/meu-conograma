import { BookOpenCheck, CalendarCheck2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DIARY_PERCEPTION_METRICS,
  DIARY_TREATMENTS,
  type DiaryPerceptionMetric,
  type DiaryTreatment,
} from "@/types/diary";
import type { WeeklySummary } from "@/lib/diary-analysis";

const METRIC_META: Record<DiaryPerceptionMetric, { label: string }> = {
  frizz: { label: "Frizz" },
  dryness: { label: "Ressecamento" },
  oiliness: { label: "Oleosidade" },
  definition: { label: "Definição" },
  shine: { label: "Brilho" },
  breakage: { label: "Quebra" },
};

function formatAverage(value: number | null): string | null {
  if (value === null || typeof value !== "number" || !Number.isFinite(value)) return null;
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  });
}

export interface WeeklySummaryCardProps {
  summary: WeeklySummary;
  onRegisterToday: () => void;
}

export function WeeklySummaryCard({ summary, onRegisterToday }: WeeklySummaryCardProps) {
  const hasAnyRegistration = summary.registeredDays > 0;

  if (!hasAnyRegistration) {
    return (
      <Card className="border-border bg-gradient-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-full border border-border bg-card/80 p-3">
            <BookOpenCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black leading-tight">
            Comece seu resumo desta semana
          </CardTitle>
          <CardDescription className="mt-2 text-sm">
            Os registros da semana atual aparecerão aqui automaticamente conforme você registrar
            seus cuidados no diário.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button
            size="lg"
            className="rounded-full px-6 shadow-glow"
            onClick={onRegisterToday}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Registrar hoje
          </Button>
        </CardContent>
      </Card>
    );
  }

  const treatments = (DIARY_TREATMENTS as readonly DiaryTreatment[])
    .map((t) => [t, summary.treatmentCounts[t] ?? 0] as const)
    .filter(([, c]) => c > 0);

  const perceived = summary.perceived;
  const hasPerceived = perceived.evaluatedCount > 0;

  const metrics = (DIARY_PERCEPTION_METRICS as readonly DiaryPerceptionMetric[])
    .map((m) => [m, summary.metrics[m]] as const)
    .filter(([, s]) => s.sampleCount > 0);

  return (
    <div className="space-y-6">
      <Card className="border-border bg-gradient-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full border-primary/30 bg-primary/5 text-foreground"
            >
              <CalendarCheck2 className="mr-1.5 h-3 w-3 text-primary" />
              Sua semana
            </Badge>
          </div>
          <CardTitle className="mt-2 text-2xl font-black leading-tight">
            Você registrou {summary.registeredDays} de {summary.elapsedDays} dias desta semana.
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {treatments.length > 0 ? (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Tratamentos registrados
              </h3>
              <div className="flex flex-wrap gap-2">
                {treatments.map(([t, c]) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="rounded-full px-3 py-1.5 text-sm font-semibold bg-secondary/70"
                  >
                    {t}
                    <span className="ml-1.5 text-muted-foreground tabular-nums">· {c}</span>
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          <Separator />

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Respostas percebidas
            </h3>
            {hasPerceived ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Com base nos registros em que você avaliou o resultado.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center justify-between gap-4">
                    <span className="font-semibold">Bom ou Muito bom</span>
                    <span className="font-bold tabular-nums text-foreground">
                      {perceived.positive}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-4">
                    <span className="font-semibold">Neutro</span>
                    <span className="font-bold tabular-nums text-foreground">
                      {perceived.neutral}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-4">
                    <span className="font-semibold">Ruim ou Muito ruim</span>
                    <span className="font-bold tabular-nums text-foreground">
                      {perceived.negative}
                    </span>
                  </li>
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ainda não existem avaliações de resultado suficientes nesta semana. Ao registrar
                como você percebeu o dia, esses dados aparecerão aqui.
              </p>
            )}
          </section>

          {metrics.length > 0 ? (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Principais métricas registradas
                </h3>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {metrics.map(([m, s]) => {
                    const avg = formatAverage(s.average);
                    const meta = METRIC_META[m];
                    return (
                      <li
                        key={m}
                        className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm"
                      >
                        <div className="text-sm font-black text-foreground">{meta.label}</div>
                        <p className="mt-1.5 text-sm text-foreground/90">
                          Nos seus registros: média{" "}
                          <span className="font-black tabular-nums">{avg ?? "—"}</span> de 5.
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {s.sampleCount === 1
                            ? "1 registro avaliado."
                            : `${s.sampleCount} registros avaliados.`}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
