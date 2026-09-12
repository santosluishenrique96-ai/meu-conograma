import { BookText, Sparkles } from "lucide-react";
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
  type DiaryPerceptionMetric,
} from "@/types/diary";
import type { TreatmentPattern, TreatmentPatternsResult } from "@/lib/diary-analysis";

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

function getHighlightedMetrics(pattern: TreatmentPattern): {
  metric: DiaryPerceptionMetric;
  average: string;
  count: number;
}[] {
  const list: { metric: DiaryPerceptionMetric; average: string; count: number }[] = [];
  for (const m of DIARY_PERCEPTION_METRICS) {
    if (!pattern.metricsSufficiency[m]) continue;
    const s = pattern.metrics[m];
    const avg = formatAverage(s.average);
    if (!avg) continue;
    list.push({ metric: m, average: avg, count: s.sampleCount });
  }
  return list.slice(0, 2);
}

export interface TreatmentPatternsCardProps {
  result: TreatmentPatternsResult;
  onRegisterToday: () => void;
}

export function TreatmentPatternsCard({
  result,
  onRegisterToday,
}: TreatmentPatternsCardProps) {
  const enough = result.patterns.filter((p) => p.hasEnoughData);

  if (enough.length === 0) {
    return (
      <Card className="border-border bg-gradient-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-full border border-border bg-card/80 p-3">
            <BookText className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black leading-tight">O que funciona para mim</CardTitle>
          <CardDescription className="mt-2 text-sm">
            Padrões observados nos dias que você registrou seus cuidados.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-border bg-card/60 p-6 text-left">
            <p className="text-base font-bold text-foreground">
              Ainda estamos conhecendo seu cabelo.
            </p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Continue registrando seus cuidados e como você percebeu o resultado. Com mais
              registros, seus padrões vão aparecer aqui.
            </p>
          </div>
          <Button
            size="lg"
            className="rounded-full px-6 shadow-glow"
            onClick={onRegisterToday}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Registrar no Diário
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-gradient-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-full border-primary/30 bg-primary/5 text-foreground"
          >
            <BookText className="mr-1.5 h-3 w-3 text-primary" />
            Padrões observados
          </Badge>
        </div>
        <CardTitle className="mt-2 text-2xl font-black leading-tight">
          O que funciona para mim
        </CardTitle>
        <CardDescription className="mt-1 text-sm">
          Padrões observados nos dias que você registrou seus cuidados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {enough.map((p, i) => {
          const metrics = getHighlightedMetrics(p);
          const hasPerceived = p.evaluatedPerceivedCount > 0;
          return (
            <div key={p.treatment}>
              <section className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black leading-tight">{p.treatment}</h3>
                  <Badge variant="outline" className="rounded-full text-xs">
                    {p.occurrences === 1
                      ? "1 ocorrência registrada"
                      : `${p.occurrences} ocorrências registradas`}
                  </Badge>
                </div>

                {hasPerceived ? (
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    Em registros com <span className="font-bold">{p.treatment}</span>, a resposta
                    percebida foi: Bom ou Muito bom em{" "}
                    <span className="font-black tabular-nums">{p.positiveCount}</span> de{" "}
                    <span className="font-black tabular-nums">{p.evaluatedPerceivedCount}</span>{" "}
                    registros avaliados; Neutro em{" "}
                    <span className="font-black tabular-nums">{p.neutralCount}</span>; Ruim ou Muito
                    ruim em <span className="font-black tabular-nums">{p.negativeCount}</span>.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Em registros com <span className="font-bold">{p.treatment}</span>, ainda não há
                    avaliações de resultado percebido suficientes para um padrão.
                  </p>
                )}

                {metrics.length > 0 ? (
                  <ul className="mt-3 space-y-1.5 rounded-2xl border border-border bg-card/70 p-4">
                    {metrics.map(({ metric, average, count }) => {
                      const label = METRIC_META[metric].label;
                      return (
                        <li
                          key={metric}
                          className="text-sm text-foreground/90 leading-relaxed"
                        >
                          <span className="font-bold">{label}</span>: média{" "}
                          <span className="font-black tabular-nums">{average}</span> em{" "}
                          {count === 1 ? "1 registro" : `${count} registros`}.
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </section>
              {i < enough.length - 1 ? <Separator className="my-5" /> : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
