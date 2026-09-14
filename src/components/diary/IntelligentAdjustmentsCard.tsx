import { AlertTriangle, ChevronRight, Lightbulb, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ScheduleFocus } from "@/constants/schedule-defaults";
import type {
  IntelligenceOutput,
  IntelligenceSuggestion,
  PerceivedComparisonEvidence,
  ProposedScheduleChangeDay,
  TreatmentPerceivedEvidence,
} from "@/lib/diary-intelligence";

const APPLY_FOCUS_OPTIONS: readonly ScheduleFocus[] = [
  "Hidratação",
  "Nutrição",
  "Reconstrução",
  "Descanso",
  "Cuidado",
] as const;

export interface IntelligentAdjustmentsApplyUi {
  readonly affectedDay: ProposedScheduleChangeDay;
  readonly currentValue: ScheduleFocus;
  readonly selectedFocus: ScheduleFocus | null;
  readonly onChangeFocus: (next: ScheduleFocus | null) => void;
  readonly onRequestReview: () => void;
  readonly isApplying: boolean;
}

export interface IntelligentAdjustmentsCardProps {
  result: IntelligenceOutput | null;
  isLoading: boolean;
  isError: boolean;
  onRegisterToday: () => void;
  applyUi: IntelligentAdjustmentsApplyUi | null;
}

const WEEKDAY_LABEL: Record<ProposedScheduleChangeDay, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};

function buildEvidenceText(sug: IntelligenceSuggestion): string | null {
  const ev = sug.evidence;
  if (ev.type === "treatment_perceived_pattern") {
    const e = ev as TreatmentPerceivedEvidence;
    if (e.evaluatedCount <= 0) return null;
    return `Em ${e.evaluatedCount} registros avaliados com ${e.treatment}, Bom ou Muito bom em ${e.positiveCount}, Neutro em ${e.neutralCount}, Ruim ou Muito ruim em ${e.negativeCount}.`;
  }
  if (ev.type === "perceived_window_comparison") {
    const e = ev as PerceivedComparisonEvidence;
    const parts: string[] = [];
    parts.push(
      `Janela recente (${e.recentSampleCount} registros): média ${e.recentAverage === null ? "—" : e.recentAverage.toFixed(1)}.`,
    );
    parts.push(
      `Janela anterior (${e.previousSampleCount}): média ${e.previousAverage === null ? "—" : e.previousAverage.toFixed(1)}.`,
    );
    return parts.join(" ");
  }
  return null;
}

function buildObservationalSummary(sug: IntelligenceSuggestion): string {
  const ev = sug.evidence;
  if (sug.id === "continue_current_pattern") {
    if (ev.type === "treatment_perceived_pattern") {
      const t = ev.treatment;
      const ratio = ev.evaluatedCount > 0 ? ev.positiveCount / ev.evaluatedCount : 0;
      const pct = Math.round(ratio * 100);
      return `${t} apareceu associado a avaliações positivas em ${pct}% dos registros avaliados.`;
    }
    return "Padrões positivos observados nos registros mais recentes.";
  }
  if (sug.id === "observe_treatment_response") {
    if (ev.type === "treatment_perceived_pattern") {
      const t = ev.treatment;
      const ratio = ev.evaluatedCount > 0 ? ev.negativeCount / ev.evaluatedCount : 0;
      const pct = Math.round(ratio * 100);
      return `${t} apareceu associado a avaliações mais baixas em ${pct}% dos registros avaliados.`;
    }
    return "Talvez valha revisar como esse tratamento está entrando na sua rotina.";
  }
  if (sug.id === "review_metric_pattern") {
    return "Um padrão de métrica apareceu de forma recorrente nos seus registros.";
  }
  if (sug.id === "note_perceived_result_shift") {
    if (sug.summaryKey === "recent_perceived_lower") {
      return "Na janela recente, a média das avaliações registradas foi menor que na janela anterior.";
    }
    if (sug.summaryKey === "recent_perceived_higher") {
      return "Na janela recente, a média das avaliações registradas foi maior que na janela anterior.";
    }
    return "Percebemos uma mudança na média das avaliações registradas entre as duas janelas.";
  }
  if (sug.id === "register_more_history") {
    return "Continue registrando seus cuidados para que os padrões fiquem mais claros.";
  }
  return "Registro observado no seu histórico do Diário.";
}

function hasAnyRelevantContent(output: IntelligenceOutput | null): boolean {
  if (!output) return false;
  return output.suggestions.some((s) => s.id !== "generic_no_action");
}

export function IntelligentAdjustmentsCard({
  result,
  isLoading,
  isError,
  onRegisterToday,
  applyUi,
}: IntelligentAdjustmentsCardProps) {
  if (isError) {
    return (
      <Card className="border-border bg-gradient-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full border-primary/30 bg-primary/5 text-foreground"
            >
              <AlertTriangle className="mr-1.5 h-3 w-3 text-muted-foreground" />
              Ajustes sugeridos para você
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar os ajustes agora.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !result) {
    return (
      <Card className="border-border bg-gradient-card">
        <CardHeader className="space-y-3">
          <div className="h-5 w-52 rounded-full bg-muted/60 animate-pulse" />
          <div className="h-7 w-72 rounded-lg bg-muted/60 animate-pulse" />
          <div className="h-4 w-full max-w-xl rounded bg-muted/40 animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-24 w-full rounded-2xl bg-muted/40 animate-pulse" />
          <div className="h-24 w-full rounded-2xl bg-muted/40 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!hasAnyRelevantContent(result)) {
    return (
      <Card className="border-border bg-gradient-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-full border border-border bg-card/80 p-3">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge
              variant="outline"
              className="rounded-full border-primary/30 bg-primary/5 text-foreground"
            >
              <Lightbulb className="mr-1.5 h-3 w-3 text-primary" />
              Ajustes sugeridos para você
            </Badge>
          </div>
          <CardTitle className="text-2xl font-black leading-tight">
            Ainda estamos conhecendo seu cabelo.
          </CardTitle>
          <CardDescription className="mt-2 text-sm">
            Continue registrando seus cuidados e como seu cabelo responde. Com mais registros,
            poderemos mostrar padrões mais úteis para você.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-xs text-muted-foreground/90">
            São padrões observados nos seus registros, não diagnósticos.
          </p>
          <Button size="lg" className="rounded-full px-6 shadow-glow" onClick={onRegisterToday}>
            <Sparkles className="mr-2 h-4 w-4" />
            Registrar no Diário
          </Button>
        </CardContent>
      </Card>
    );
  }

  const items = result.suggestions.filter((s) => s.id !== "generic_no_action");

  return (
    <Card className="border-border bg-gradient-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-full border-primary/30 bg-primary/5 text-foreground"
          >
            <Lightbulb className="mr-1.5 h-3 w-3 text-primary" />
            Ajustes sugeridos para você
          </Badge>
        </div>
        <CardTitle className="mt-2 text-2xl font-black leading-tight">
          Sugestões baseadas no que você registrou no Diário.
        </CardTitle>
        <CardDescription className="mt-1 text-xs text-muted-foreground/95 leading-relaxed">
          São padrões observados nos seus registros, não diagnósticos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {items.map((sug, idx) => {
          const evidence = buildEvidenceText(sug);
          const change = sug.proposedScheduleChange;
          const hasChange = change !== null;
          const firstEntry = change && change.entries.length > 0 ? change.entries[0] : null;
          const affectedDay = firstEntry?.affectedDay ?? firstEntry?.day ?? null;
          return (
            <div key={sug.summaryKey}>
              <section className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-black leading-tight">
                    {hasChange
                      ? `Revisar frequência de ${change?.treatment ?? firstEntry?.treatment ?? "tratamento"}`
                      : buildObservationalSummary(sug)}
                  </h3>
                  {hasChange ? (
                    <Badge variant="outline" className="rounded-full text-xs">
                      Proposta
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="rounded-full text-xs bg-secondary/70">
                      Observação
                    </Badge>
                  )}
                </div>

                {!hasChange ? (
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {buildObservationalSummary(sug)}
                  </p>
                ) : null}

                {evidence ? (
                  <div className="rounded-2xl border border-border bg-card/70 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Evidência
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">{evidence}</p>
                  </div>
                ) : null}

                {hasChange ? (
                  <>
                    <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                        Proposta
                      </div>
                      <p className="text-sm font-semibold text-foreground leading-relaxed">
                        {change?.description}
                      </p>
                      {typeof change?.currentWeeklyFrequency === "number" &&
                      typeof change?.proposedWeeklyFrequency === "number" ? (
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-border bg-card/80 p-3">
                            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                              Atual
                            </div>
                            <div className="text-base font-black tabular-nums">
                              {change.currentWeeklyFrequency}x por semana
                            </div>
                          </div>
                          <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
                            <div className="text-xs uppercase tracking-wider text-primary mb-1">
                              Proposta
                            </div>
                            <div className="text-base font-black tabular-nums text-primary-foreground/95 text-foreground">
                              {change.proposedWeeklyFrequency}x por semana
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {affectedDay ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Dia a revisar:{" "}
                          <span className="font-semibold text-foreground/90">
                            {WEEKDAY_LABEL[affectedDay]}
                          </span>
                        </p>
                      ) : null}

                      {applyUi && affectedDay && applyUi.affectedDay === affectedDay ? (
                        <div className="mt-5 space-y-4 rounded-2xl border border-primary/25 bg-card/80 p-4">
                          <div className="space-y-2">
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Novo foco para {WEEKDAY_LABEL[applyUi.affectedDay]}
                            </div>
                            <Select
                              value={applyUi.selectedFocus ?? ""}
                              onValueChange={(raw) => {
                                const valid = APPLY_FOCUS_OPTIONS.includes(raw as ScheduleFocus)
                                  ? (raw as ScheduleFocus)
                                  : null;
                                applyUi.onChangeFocus(valid);
                              }}
                              disabled={applyUi.isApplying}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o novo foco" />
                              </SelectTrigger>
                              <SelectContent>
                                {APPLY_FOCUS_OPTIONS.map((opt) => {
                                  const blocked = opt === applyUi.currentValue;
                                  return (
                                    <SelectItem
                                      key={opt}
                                      value={opt}
                                      disabled={blocked}
                                      className={blocked ? "opacity-50 cursor-not-allowed" : ""}
                                    >
                                      {opt}
                                      {blocked ? " (atual)" : ""}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          {applyUi.selectedFocus &&
                          applyUi.selectedFocus !== applyUi.currentValue ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div className="rounded-xl border border-border bg-card/90 p-3">
                                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                                  Antes
                                </div>
                                <div className="text-sm font-bold tabular-nums text-foreground/95">
                                  {WEEKDAY_LABEL[applyUi.affectedDay]} — {applyUi.currentValue}
                                </div>
                              </div>
                              <div className="rounded-xl border border-primary/35 bg-primary/10 p-3">
                                <div className="text-xs uppercase tracking-wider text-primary mb-1">
                                  Depois
                                </div>
                                <div className="text-sm font-bold tabular-nums text-foreground">
                                  {WEEKDAY_LABEL[applyUi.affectedDay]} — {applyUi.selectedFocus}
                                </div>
                              </div>
                            </div>
                          ) : null}

                          <Button
                            type="button"
                            disabled={
                              !applyUi.selectedFocus ||
                              applyUi.selectedFocus === applyUi.currentValue ||
                              applyUi.isApplying
                            }
                            onClick={applyUi.onRequestReview}
                            className="w-full rounded-full shadow-glow"
                          >
                            {applyUi.isApplying ? (
                              <>Aplicando…</>
                            ) : (
                              <>
                                Revisar alteração
                                <ChevronRight className="ml-1 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </section>
              {idx < items.length - 1 ? <Separator className="my-5" /> : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
