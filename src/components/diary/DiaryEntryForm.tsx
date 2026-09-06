import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCheck,
  Eraser,
  Loader2,
  PenLine,
  PlusCircle,
  Save,
  Sparkles,
} from "lucide-react";
import {
  DIARY_PERCEIVED_RESULTS,
  DIARY_PERCEPTION_METRICS,
  DIARY_TREATMENTS,
  type DiaryEntryFormValues,
  type DiaryEntryRow,
  type DiaryPerceptionMetric,
  type DiaryPerceptionScale,
  type DiaryPerceivedResult,
  type DiaryTreatment,
  type ScheduleFocusSnapshot,
} from "@/types/diary";
import type { DiaryEntryPayloadShape } from "@/services/diary";
import type { useDiaryUpsertEntry } from "@/hooks/use-diary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DiaryMetrics } from "@/components/diary/DiaryMetrics";
import { cn } from "@/lib/utils";

export interface DiaryEntryFormProps {
  selectedDate: Date;
  entry: DiaryEntryRow | null | undefined;
  isLoadingEntry: boolean;
  isFuture: boolean;
  isToday: boolean;
  upsertMutation: ReturnType<typeof useDiaryUpsertEntry>;
}

const WEEKDAY_BR: Record<string, string> = {
  sunday: "Domingo",
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
};

function formatDateLong(date: Date, weekday?: string | null) {
  const label = weekday ? (WEEKDAY_BR[weekday] ?? null) : null;
  const datePart = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  if (label) return `${label}, ${datePart}`;
  return datePart;
}

function initialValuesFromEntry(
  entry: DiaryEntryRow | null | undefined,
  entryDate: string,
): DiaryEntryFormValues {
  const base: DiaryEntryFormValues = {
    entry_date: entryDate,
    treatments: [],
    perceived_result: null,
    frizz: null,
    dryness: null,
    oiliness: null,
    definition: null,
    shine: null,
    breakage: null,
    note: null,
    evolution_photo_id: null,
  };
  if (!entry) return base;
  const raw = entry as unknown as Record<string, unknown>;
  return {
    entry_date: entry.entry_date,
    treatments: (entry.treatments ?? []) as DiaryTreatment[],
    perceived_result: (entry.perceived_result as DiaryEntryFormValues["perceived_result"]) ?? null,
    frizz: (raw.frizz as DiaryPerceptionScale | null) ?? null,
    dryness: (raw.dryness as DiaryPerceptionScale | null) ?? null,
    oiliness: (raw.oiliness as DiaryPerceptionScale | null) ?? null,
    definition: (raw.definition as DiaryPerceptionScale | null) ?? null,
    shine: (raw.shine as DiaryPerceptionScale | null) ?? null,
    breakage: (raw.breakage as DiaryPerceptionScale | null) ?? null,
    note: entry.note ?? null,
    evolution_photo_id: entry.evolution_photo_id ?? null,
  };
}

function buildPayload(
  v: DiaryEntryFormValues,
  existingEvolutionPhotoId: string | null | undefined,
  updateEvolutionPhoto: boolean,
): DiaryEntryPayloadShape {
  const base: DiaryEntryPayloadShape = {
    treatments: v.treatments.length > 0 ? v.treatments : undefined,
    perceived_result: v.perceived_result ?? undefined,
    frizz: v.frizz ?? undefined,
    dryness: v.dryness ?? undefined,
    oiliness: v.oiliness ?? undefined,
    definition: v.definition ?? undefined,
    shine: v.shine ?? undefined,
    breakage: v.breakage ?? undefined,
    note: v.note === "" ? null : (v.note ?? undefined),
  };
  if (updateEvolutionPhoto) {
    if (v.evolution_photo_id === null && existingEvolutionPhotoId == null) {
      base.evolution_photo_id = undefined;
    } else if (v.evolution_photo_id !== existingEvolutionPhotoId) {
      base.evolution_photo_id = v.evolution_photo_id;
    }
  }
  return base;
}

export function DiaryEntryForm({
  selectedDate,
  entry,
  isLoadingEntry,
  isFuture,
  isToday,
  upsertMutation,
}: DiaryEntryFormProps) {
  const initialEntryDate = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [selectedDate]);
  const [values, setValues] = useState<DiaryEntryFormValues>(() =>
    initialValuesFromEntry(entry, initialEntryDate),
  );

  useEffect(() => {
    setValues(initialValuesFromEntry(entry, initialEntryDate));
  }, [entry, initialEntryDate]);

  const snapshot: ScheduleFocusSnapshot | null =
    (entry?.scheduled_focus_snapshot as ScheduleFocusSnapshot | null) ?? null;

  const existing = Boolean(entry);
  const existingEvolutionPhotoId = entry?.evolution_photo_id ?? null;
  const updateEvolutionPhoto = !existing;
  const saving = upsertMutation.isPending;

  const dateLabel = useMemo(() => {
    return formatDateLong(selectedDate, snapshot?.weekday ?? null);
  }, [selectedDate, snapshot?.weekday]);

  const setMetric = (m: DiaryPerceptionMetric, v: DiaryPerceptionScale | null) => {
    setValues((prev) => ({ ...prev, [m]: v }));
  };

  const setTreatments = (next: string[]) => {
    const safe = next.filter((t): t is DiaryTreatment =>
      (DIARY_TREATMENTS as readonly string[]).includes(t),
    );
    setValues((prev) => ({ ...prev, treatments: safe }));
  };

  const setPerceived = (v: string) => {
    const canonical = DIARY_PERCEIVED_RESULTS.find((r) => r === v);
    if (!canonical) {
      setValues((prev) => ({ ...prev, perceived_result: null }));
      return;
    }
    const typed: DiaryPerceivedResult = canonical;
    setValues((prev) => ({ ...prev, perceived_result: typed }));
  };

  const handleSave = () => {
    if (isFuture) return;
    const payload = buildPayload(values, existingEvolutionPhotoId, updateEvolutionPhoto);
    upsertMutation.mutate({ date: selectedDate, payload });
  };

  const handleClear = () => {
    setValues({
      entry_date: initialEntryDate,
      treatments: [],
      perceived_result: null,
      frizz: null,
      dryness: null,
      oiliness: null,
      definition: null,
      shine: null,
      breakage: null,
      note: null,
      evolution_photo_id: existing ? existingEvolutionPhotoId : null,
    });
  };

  const resultValue = values.perceived_result ?? "";

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            {isToday ? "Registro de hoje" : "Registro de"}
          </div>
          <h3 className="text-2xl md:text-3xl font-black flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            {dateLabel}
          </h3>
          {snapshot?.focus ? (
            <div className="mt-3">
              <Badge variant="secondary" className="font-medium">
                <Sparkles className="h-3 w-3 mr-1.5" /> Planejado: {snapshot.focus}
                {snapshot.hair_type ? ` · ${snapshot.hair_type}` : ""}
                {snapshot.goal ? ` · ${snapshot.goal}` : ""}
              </Badge>
            </div>
          ) : null}
        </div>
        {isFuture ? (
          <Badge variant="destructive" className="shrink-0">
            <Ban className="h-3 w-3 mr-1.5" /> Data futura bloqueada
          </Badge>
        ) : existing ? (
          <Badge variant="default" className="shrink-0">
            <CheckCheck className="h-3 w-3 mr-1.5" /> Editando registro existente
          </Badge>
        ) : (
          <Badge variant="outline" className="shrink-0">
            <PlusCircle className="h-3 w-3 mr-1.5" /> Novo registro
          </Badge>
        )}
      </div>

      {isLoadingEntry ? (
        <div className="rounded-3xl bg-gradient-card border border-border shadow-elegant p-6 md:p-8 space-y-5">
          <div className="space-y-3">
            <SkeletonInline className="h-5 w-40" />
            <SkeletonInline className="h-9 w-full" />
          </div>
          <SkeletonInline className="h-28 w-full rounded-2xl" />
          <Separator />
          <SkeletonInline className="h-6 w-56" />
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonInline key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <Card className="rounded-3xl bg-gradient-card border border-border shadow-elegant">
          <CardHeader>
            <CardTitle className="text-xl">Como foi o cuidado hoje?</CardTitle>
            <CardDescription>Preencha o que fez e como seus fios se sentiram.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8 md:grid-cols-5">
            <div className="md:col-span-3 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-bold">Tratamentos realizados</Label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {values.treatments.length} selecionado
                    {values.treatments.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ToggleGroup
                  type="multiple"
                  value={values.treatments}
                  onValueChange={setTreatments}
                  className="flex flex-wrap gap-2 justify-start"
                  aria-label="Tratamentos realizados"
                >
                  {DIARY_TREATMENTS.map((t) => (
                    <ToggleGroupItem
                      key={t}
                      value={t}
                      aria-label={t}
                      className={cn(
                        "rounded-full border data-[state=on]:bg-gradient-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-glow data-[state=on]:border-transparent data-[state=on]:hover:text-primary-foreground text-sm px-4 py-2",
                      )}
                    >
                      {t}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-bold" htmlFor="diary-note">
                  Observação <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="diary-note"
                  placeholder="Detalhes do dia, produtos usados, como se sentiu..."
                  value={values.note ?? ""}
                  maxLength={500}
                  rows={5}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      note: e.target.value === "" ? null : e.target.value,
                    }))
                  }
                  className="resize-none rounded-2xl text-base"
                />
                <div className="flex justify-end text-xs text-muted-foreground tabular-nums">
                  {(values.note ?? "").length} / 500
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-7">
              <div className="space-y-3">
                <Label className="text-base font-bold">Resultado percebido</Label>
                <RadioGroup
                  value={resultValue}
                  onValueChange={setPerceived}
                  className="grid grid-cols-1 gap-2"
                  aria-label="Resultado percebido"
                >
                  {(DIARY_PERCEIVED_RESULTS as readonly string[]).map((label, i) => (
                    <div key={label}>
                      <Label
                        htmlFor={`result-${i}`}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border border-border bg-card/60 cursor-pointer transition-smooth hover:border-primary/40 hover:bg-card"
                      >
                        <RadioGroupItem value={label} id={`result-${i}`} />
                        <span className="font-medium">{label}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-base font-bold">Métricas do dia</Label>
                <DiaryMetrics values={values} onChange={setMetric} />
              </div>
            </div>
          </CardContent>
          <div className="px-6 md:px-8 pb-6 md:pb-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between border-t border-border/70 pt-6 mt-2">
            <div className="text-xs text-muted-foreground">
              {DIARY_PERCEPTION_METRICS.filter((k) => values[k] != null).length}/
              {DIARY_PERCEPTION_METRICS.length} métricas avaliadas.
            </div>
            <div className="flex items-stretch sm:items-center gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={handleClear}
                disabled={saving || isFuture}
                type="button"
              >
                <Eraser className="h-3.5 w-3.5 mr-1.5" /> Limpar seleção
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || isFuture}
                type="button"
                className="rounded-full bg-gradient-primary font-bold shadow-glow hover:scale-[1.02] transition-smooth"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                {saving ? "Salvando..." : "Salvar registro"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function SkeletonInline({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted/70", className)} />;
}
