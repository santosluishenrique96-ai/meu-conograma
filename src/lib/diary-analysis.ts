import {
  DIARY_PERCEIVED_RESULTS,
  DIARY_PERCEPTION_METRICS,
  DIARY_TREATMENTS,
  type DiaryPerceivedResult,
  type DiaryPerceptionMetric,
  type DiaryTreatment,
} from "@/types/diary";
import type { DiaryEntryRow } from "@/types/diary";

const CIVIL_KEY_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const POSITIVE_PERCEIVED_SET = new Set<DiaryPerceivedResult>(["Bom", "Muito bom"]);
const NEUTRAL_PERCEIVED_SET = new Set<DiaryPerceivedResult>(["Neutro"]);
const NEGATIVE_PERCEIVED_SET = new Set<DiaryPerceivedResult>(["Ruim", "Muito ruim"]);

const PERCEIVED_ORDINAL: Record<DiaryPerceivedResult, number> = {
  "Muito ruim": 1,
  Ruim: 2,
  Neutro: 3,
  Bom: 4,
  "Muito bom": 5,
};

const TREATMENT_SET = new Set<string>(DIARY_TREATMENTS);
const METRIC_SET = new Set<string>(DIARY_PERCEPTION_METRICS);

export type MetricStats = {
  average: number | null;
  sampleCount: number;
};

export type WeeklySummary = {
  registeredDays: number;
  elapsedDays: number;
  weekStartCivilKey: string;
  weekEndCivilKey: string;
  treatmentCounts: Record<string, number>;
  perceived: {
    positive: number;
    neutral: number;
    negative: number;
    evaluatedCount: number;
  };
  metrics: Record<DiaryPerceptionMetric, MetricStats>;
};

export type PerceivedMetricComparison = {
  olderAverage: number | null;
  recentAverage: number | null;
  difference: number | null;
  olderSampleCount: number;
  recentSampleCount: number;
};

export type PerceivedComparison = {
  overall: {
    olderAverage: number | null;
    recentAverage: number | null;
    difference: number | null;
    olderSampleCount: number;
    recentSampleCount: number;
  };
  metrics: Record<DiaryPerceptionMetric, PerceivedMetricComparison>;
  olderSampleSize: number;
  recentSampleSize: number;
};

export type TreatmentPattern = {
  treatment: DiaryTreatment;
  occurrences: number;
  evaluatedPerceivedCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  metrics: Record<DiaryPerceptionMetric, MetricStats>;
  hasEnoughData: boolean;
  metricsSufficiency: Record<DiaryPerceptionMetric, boolean>;
  perceivedSufficiency: boolean;
};

export type TreatmentPatternsResult = {
  patterns: TreatmentPattern[];
};

function addDaysLocal(base: Date, days: number): Date {
  const t = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12, 0, 0, 0);
  t.setDate(t.getDate() + days);
  return t;
}

function startOfWeekMonday(date: Date): Date {
  const weekday = date.getDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return addDaysLocal(date, delta);
}

function toCivilKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseCivilKeyOrThrow(raw: unknown): Date {
  if (typeof raw !== "string") {
    throw new Error("entry_date precisa ser string YYYY-MM-DD");
  }
  const m = raw.match(CIVIL_KEY_RE);
  if (!m) {
    throw new Error(`entry_date inválido: ${String(raw).slice(0, 20)}`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(y, mo - 1, d, 12, 0, 0, 0);
}

function isPerceivedResult(value: unknown): value is DiaryPerceivedResult {
  return (
    typeof value === "string" && (DIARY_PERCEIVED_RESULTS as readonly string[]).includes(value)
  );
}

function averageNonNull(values: (number | null | undefined)[]): {
  average: number | null;
  sampleCount: number;
} {
  let sum = 0;
  let count = 0;
  for (const v of values) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    sum += v;
    count += 1;
  }
  if (count === 0) return { average: null, sampleCount: 0 };
  return { average: sum / count, sampleCount: count };
}

function emptyMetricStats(): Record<DiaryPerceptionMetric, MetricStats> {
  const out = {} as Record<DiaryPerceptionMetric, MetricStats>;
  for (const k of DIARY_PERCEPTION_METRICS) {
    out[k] = { average: null, sampleCount: 0 };
  }
  return out;
}

function emptyMetricComparison(): Record<DiaryPerceptionMetric, PerceivedMetricComparison> {
  const out = {} as Record<DiaryPerceptionMetric, PerceivedMetricComparison>;
  for (const k of DIARY_PERCEPTION_METRICS) {
    out[k] = {
      olderAverage: null,
      recentAverage: null,
      difference: null,
      olderSampleCount: 0,
      recentSampleCount: 0,
    };
  }
  return out;
}

type TreatmentAccumulator = {
  occurrences: number;
  perceivedEvaluated: number;
  positive: number;
  neutral: number;
  negative: number;
  metricValues: Record<DiaryPerceptionMetric, number[]>;
};

function buildTreatmentAccumulator(): TreatmentAccumulator {
  const metricValues = {} as Record<DiaryPerceptionMetric, number[]>;
  for (const k of DIARY_PERCEPTION_METRICS) metricValues[k] = [];
  return {
    occurrences: 0,
    perceivedEvaluated: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    metricValues,
  };
}

export function computeWeeklySummary(inputRows: DiaryEntryRow[], today: Date): WeeklySummary {
  const rows = inputRows;
  const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
  const monday = startOfWeekMonday(todayNoon);
  const sunday = addDaysLocal(monday, 6);
  const mondayKey = toCivilKey(monday);
  const sundayKey = toCivilKey(sunday);
  const todayKey = toCivilKey(todayNoon);

  const uniqueDays = new Set<string>();
  const treatmentCounts: Record<string, number> = {};
  for (const t of DIARY_TREATMENTS) treatmentCounts[t] = 0;

  let positive = 0;
  let neutral = 0;
  let negative = 0;
  let evaluatedCount = 0;

  const metricValues = {} as Record<DiaryPerceptionMetric, number[]>;
  for (const m of DIARY_PERCEPTION_METRICS) metricValues[m] = [];

  for (const row of rows) {
    const d = parseCivilKeyOrThrow(row.entry_date);
    const dk = toCivilKey(d);
    if (dk < mondayKey || dk > todayKey || dk > sundayKey) continue;

    uniqueDays.add(dk);

    if (Array.isArray(row.treatments)) {
      for (const t of row.treatments) {
        if (TREATMENT_SET.has(String(t))) {
          treatmentCounts[String(t)] = (treatmentCounts[String(t)] ?? 0) + 1;
        }
      }
    }

    if (isPerceivedResult(row.perceived_result)) {
      evaluatedCount += 1;
      if (POSITIVE_PERCEIVED_SET.has(row.perceived_result)) positive += 1;
      else if (NEUTRAL_PERCEIVED_SET.has(row.perceived_result)) neutral += 1;
      else if (NEGATIVE_PERCEIVED_SET.has(row.perceived_result)) negative += 1;
    }

    for (const m of DIARY_PERCEPTION_METRICS) {
      const val = row[m];
      if (typeof val === "number" && Number.isFinite(val) && val >= 1 && val <= 5) {
        metricValues[m].push(val);
      }
    }
  }

  const metrics = emptyMetricStats();
  for (const m of DIARY_PERCEPTION_METRICS) {
    const r = averageNonNull(metricValues[m]);
    metrics[m] = r;
  }

  const mondayIdx = monday.getDay();
  const todayIdx = todayNoon.getDay();
  let elapsedDays: number;
  if (todayIdx === 0) elapsedDays = 7;
  else if (mondayIdx === todayIdx) elapsedDays = 1;
  else elapsedDays = todayIdx === 0 ? 7 : todayIdx;

  const rowsFrozen = Object.isFrozen(rows);
  void rowsFrozen;

  return {
    registeredDays: uniqueDays.size,
    elapsedDays,
    weekStartCivilKey: mondayKey,
    weekEndCivilKey: sundayKey,
    treatmentCounts,
    perceived: {
      positive,
      neutral,
      negative,
      evaluatedCount,
    },
    metrics,
  };
}

export function computePerceivedComparison(
  olderRows: DiaryEntryRow[],
  recentRows: DiaryEntryRow[],
): PerceivedComparison {
  function processWindow(window: DiaryEntryRow[]): {
    avgPerceived: number | null;
    perceivedSamples: number;
    metricSamples: Record<DiaryPerceptionMetric, number[]>;
    totalRows: number;
  } {
    let sumPerceived = 0;
    let perceivedCount = 0;
    const metricSamples = {} as Record<DiaryPerceptionMetric, number[]>;
    for (const m of DIARY_PERCEPTION_METRICS) metricSamples[m] = [];

    for (const row of window) {
      if (isPerceivedResult(row.perceived_result)) {
        sumPerceived += PERCEIVED_ORDINAL[row.perceived_result];
        perceivedCount += 1;
      }
      for (const m of DIARY_PERCEPTION_METRICS) {
        const v = row[m];
        if (typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 5) {
          metricSamples[m].push(v);
        }
      }
    }
    return {
      avgPerceived: perceivedCount === 0 ? null : sumPerceived / perceivedCount,
      perceivedSamples: perceivedCount,
      metricSamples,
      totalRows: window.length,
    };
  }

  const older = processWindow(olderRows);
  const recent = processWindow(recentRows);

  const metrics = emptyMetricComparison();
  for (const m of DIARY_PERCEPTION_METRICS) {
    const o = averageNonNull(older.metricSamples[m]);
    const r = averageNonNull(recent.metricSamples[m]);
    let diff: number | null = null;
    if (typeof o.average === "number" && typeof r.average === "number") {
      diff = r.average - o.average;
      if (!Number.isFinite(diff)) diff = null;
    }
    metrics[m] = {
      olderAverage: o.average,
      recentAverage: r.average,
      difference: diff,
      olderSampleCount: o.sampleCount,
      recentSampleCount: r.sampleCount,
    };
  }

  let overallDiff: number | null = null;
  if (typeof older.avgPerceived === "number" && typeof recent.avgPerceived === "number") {
    overallDiff = recent.avgPerceived - older.avgPerceived;
    if (!Number.isFinite(overallDiff)) overallDiff = null;
  }

  return {
    overall: {
      olderAverage: older.avgPerceived,
      recentAverage: recent.avgPerceived,
      difference: overallDiff,
      olderSampleCount: older.perceivedSamples,
      recentSampleCount: recent.perceivedSamples,
    },
    metrics,
    olderSampleSize: older.totalRows,
    recentSampleSize: recent.totalRows,
  };
}

export function computeTreatmentPatterns(inputRows: DiaryEntryRow[]): TreatmentPatternsResult {
  const acc = new Map<string, TreatmentAccumulator>();

  for (const row of inputRows) {
    const treatments: string[] = Array.isArray(row.treatments)
      ? row.treatments.filter((t): t is string => TREATMENT_SET.has(String(t)))
      : [];
    if (treatments.length === 0) continue;

    for (const t of treatments) {
      if (!acc.has(t)) acc.set(t, buildTreatmentAccumulator());
      const bucket = acc.get(t)!;
      bucket.occurrences += 1;

      if (isPerceivedResult(row.perceived_result)) {
        bucket.perceivedEvaluated += 1;
        if (POSITIVE_PERCEIVED_SET.has(row.perceived_result)) bucket.positive += 1;
        else if (NEUTRAL_PERCEIVED_SET.has(row.perceived_result)) bucket.neutral += 1;
        else if (NEGATIVE_PERCEIVED_SET.has(row.perceived_result)) bucket.negative += 1;
      }

      for (const m of DIARY_PERCEPTION_METRICS) {
        const v = row[m];
        if (typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 5) {
          bucket.metricValues[m].push(v);
        }
      }
    }
  }

  const patterns: TreatmentPattern[] = [];
  for (const t of DIARY_TREATMENTS) {
    const a = acc.get(t);
    if (!a) continue;

    const metrics = emptyMetricStats();
    const sufficiency = {} as Record<DiaryPerceptionMetric, boolean>;
    for (const m of DIARY_PERCEPTION_METRICS) {
      const r = averageNonNull(a.metricValues[m]);
      metrics[m] = r;
      sufficiency[m] = r.sampleCount >= 3;
    }

    const perceivedSufficiency = a.perceivedEvaluated >= 3;
    let hasEnoughData = perceivedSufficiency;
    for (const m of DIARY_PERCEPTION_METRICS) {
      if (sufficiency[m]) {
        hasEnoughData = true;
        break;
      }
    }

    patterns.push({
      treatment: t,
      occurrences: a.occurrences,
      evaluatedPerceivedCount: a.perceivedEvaluated,
      positiveCount: a.positive,
      neutralCount: a.neutral,
      negativeCount: a.negative,
      metrics,
      hasEnoughData,
      metricsSufficiency: sufficiency,
      perceivedSufficiency,
    });
  }

  return { patterns };
}

export function _readCivilKeyForTestOnly(date: Date): string {
  return toCivilKey(date);
}

export function _mondayOfForTestOnly(date: Date): Date {
  return startOfWeekMonday(date);
}

export function _addDaysForTestOnly(date: Date, days: number): Date {
  return addDaysLocal(date, days);
}
