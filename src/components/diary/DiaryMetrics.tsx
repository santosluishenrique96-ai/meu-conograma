import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  DIARY_PERCEPTION_METRICS,
  type DiaryPerceptionMetric,
  type DiaryPerceptionScale,
} from "@/types/diary";

const METRIC_META: Record<
  DiaryPerceptionMetric,
  { label: string; lowLabel: string; highLabel: string }
> = {
  frizz: { label: "Frizz", lowLabel: "baixo", highLabel: "alto" },
  dryness: { label: "Ressecamento", lowLabel: "baixo", highLabel: "alto" },
  oiliness: { label: "Oleosidade", lowLabel: "baixa", highLabel: "alta" },
  definition: { label: "Definição", lowLabel: "baixa", highLabel: "alta" },
  shine: { label: "Brilho", lowLabel: "baixo", highLabel: "alto" },
  breakage: { label: "Quebra", lowLabel: "baixa", highLabel: "alta" },
};

const SCALE_LABEL: Record<number, string> = {
  1: "muito baixo(a)",
  2: "baixo(a)",
  3: "médio(a)",
  4: "alto(a)",
  5: "muito alto(a)",
};

export interface DiaryMetricsProps {
  values: Partial<Record<DiaryPerceptionMetric, DiaryPerceptionScale | null>>;
  onChange: (metric: DiaryPerceptionMetric, value: DiaryPerceptionScale | null) => void;
  className?: string;
}

export function DiaryMetrics({ values, onChange, className }: DiaryMetricsProps) {
  return (
    <div className={cn("space-y-5", className)}>
      {DIARY_PERCEPTION_METRICS.map((metric) => {
        const meta = METRIC_META[metric];
        const current = values[metric] ?? null;
        const currentNumber = current ?? 3;

        return (
          <div key={metric} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Label htmlFor={`metric-${metric}`} className="font-semibold text-foreground">
                {meta.label}
              </Label>
              <span className="text-xs text-muted-foreground font-medium tabular-nums">
                {current ? `${current} / 5 · ${SCALE_LABEL[current] ?? ""}` : "não avaliado"}
              </span>
            </div>
            <div className="flex items-center gap-3 px-1">
              <span className="text-[11px] text-muted-foreground w-12 shrink-0">
                {meta.lowLabel}
              </span>
              <div className="flex-1">
                <Slider
                  id={`metric-${metric}`}
                  min={1}
                  max={5}
                  step={1}
                  value={[currentNumber]}
                  onValueChange={([v]) => onChange(metric, v as DiaryPerceptionScale)}
                  aria-label={meta.label}
                  aria-valuemin={1}
                  aria-valuemax={5}
                  aria-valuenow={currentNumber}
                />
              </div>
              <span className="text-[11px] text-muted-foreground w-12 shrink-0 text-right">
                {meta.highLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
