import { CalendarDays, Sparkles, PencilLine } from "lucide-react";
import {
  DIARY_PERCEIVED_RESULTS,
  DIARY_PERCEPTION_METRICS,
  DIARY_TREATMENTS,
  type DiaryEntryRow,
  type DiaryPerceivedResult,
  type DiaryPerceptionMetric,
  type ScheduleFocusSnapshot,
} from "@/types/diary";
import { parseSavedScheduleSnapshot } from "@/services/diary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const RESULT_VARIANT: Record<
  DiaryPerceivedResult,
  "destructive" | "secondary" | "default" | "outline"
> = {
  "Muito ruim": "destructive",
  Ruim: "destructive",
  Neutro: "secondary",
  Bom: "default",
  "Muito bom": "default",
};

const WEEKDAY_BR: Record<string, string> = {
  sunday: "Domingo",
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
};

export interface DiaryEntryCardProps {
  entry: DiaryEntryRow;
  onEdit: (entryDate: string) => void;
  className?: string;
}

function formatDateBr(entryDate: string, weekday?: string | null) {
  try {
    const [y, m, d] = entryDate.split("-").map((n) => parseInt(n, 10));
    const dt = new Date(y, m - 1, d);
    const datePart = dt.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    if (!weekday) return datePart;
    const label = WEEKDAY_BR[weekday] ?? weekday;
    return `${label}, ${datePart}`;
  } catch {
    return entryDate;
  }
}

function resultBadge(resultValue: DiaryPerceivedResult | null | undefined): {
  label: string;
  variant: "outline" | "default" | "secondary" | "destructive";
} {
  if (resultValue == null) {
    return { label: "Sem resultado", variant: "outline" };
  }
  const variant = RESULT_VARIANT[resultValue] ?? "outline";
  return { label: resultValue, variant };
}

type SafeSnapshot = {
  weekday: string | null;
  focus: string | null;
  hair_type: string | null;
  goal: string | null;
  schedule_source: string | null;
};

function toSafeSnapshot(v: unknown): SafeSnapshot {
  const parsed = parseSavedScheduleSnapshot(v);
  if (!parsed) {
    return { weekday: null, focus: null, hair_type: null, goal: null, schedule_source: null };
  }
  return {
    weekday: parsed.weekday,
    focus: parsed.focus,
    hair_type: parsed.hair_type,
    goal: parsed.goal,
    schedule_source: parsed.schedule_source,
  };
}

export function DiaryEntryCard({ entry, onEdit, className }: DiaryEntryCardProps) {
  const snapshot = toSafeSnapshot(entry.scheduled_focus_snapshot);
  const treatments = (entry.treatments ?? []) as string[];
  const result = resultBadge(entry.perceived_result as DiaryPerceivedResult | null | undefined);
  const dateLabel = formatDateBr(entry.entry_date, snapshot.weekday ?? null);

  const safeMetrics = (): Partial<Record<DiaryPerceptionMetric, number | null>> => {
    const raw = entry as unknown as Record<string, number | null>;
    return Object.fromEntries(DIARY_PERCEPTION_METRICS.map((k) => [k, raw[k] ?? null])) as Partial<
      Record<DiaryPerceptionMetric, number | null>
    >;
  };
  const metrics = safeMetrics();
  const filledMetrics = DIARY_PERCEPTION_METRICS.filter((k) => metrics[k] != null).length;

  const extra = Math.max(0, treatments.length - 4);

  return (
    <Card
      className={cn(
        "rounded-3xl bg-gradient-card border border-border shadow-elegant transition-smooth hover:border-primary/50",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{dateLabel}</span>
          </div>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Registro do dia
          </CardTitle>
          {snapshot.focus ? (
            <CardDescription>
              Planejado:{" "}
              <Badge variant="secondary" className="ml-1">
                {snapshot.focus}
                {snapshot.hair_type ? ` · ${snapshot.hair_type}` : ""}
              </Badge>
            </CardDescription>
          ) : null}
        </div>
        <Badge variant={result.variant} className="capitalize shrink-0">
          {result.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5">
        {treatments.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {treatments.slice(0, 4).map((t) => {
              const label = (DIARY_TREATMENTS as readonly string[]).includes(t) ? t : t;
              return (
                <Badge key={t} variant="outline" className="font-medium">
                  {label}
                </Badge>
              );
            })}
            {extra > 0 ? (
              <Badge variant="outline" className="font-medium">
                +{extra}
              </Badge>
            ) : null}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">Nenhum tratamento registrado.</div>
        )}

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Métricas ({filledMetrics} / {DIARY_PERCEPTION_METRICS.length})
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {DIARY_PERCEPTION_METRICS.map((m) => {
              const v = metrics[m];
              const pct = v == null ? 0 : (v / 5) * 100;
              return (
                <div key={m} className="space-y-1">
                  <div className="text-[10px] text-muted-foreground capitalize truncate">
                    {m === "dryness"
                      ? "Ress."
                      : m === "oiliness"
                        ? "Óleo"
                        : m === "definition"
                          ? "Def."
                          : m === "shine"
                            ? "Bril"
                            : m === "breakage"
                              ? "Queb"
                              : m}
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[10px] tabular-nums text-muted-foreground">
                    {v ?? "-"} /5
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {entry.note ? (
          <div className="rounded-2xl bg-card/60 border border-border p-3 text-sm text-foreground/90 line-clamp-3">
            {entry.note}
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={() => onEdit(entry.entry_date)}
        >
          <PencilLine className="h-3.5 w-3.5 mr-1.5" /> Editar este dia
        </Button>
      </CardFooter>
    </Card>
  );
}
