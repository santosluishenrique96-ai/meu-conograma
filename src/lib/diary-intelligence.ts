import {
  DIARY_PERCEIVED_RESULTS,
  DIARY_PERCEPTION_METRICS,
  DIARY_TREATMENTS,
  type DiaryPerceivedResult,
  type DiaryPerceptionMetric,
  type DiaryTreatment,
} from "@/types/diary";
import type { DiaryEntryRow } from "@/types/diary";
import {
  computePerceivedComparison,
  computeTreatmentPatterns,
  type MetricStats,
  type PerceivedComparison,
  type TreatmentPattern,
  type TreatmentPatternsResult,
  type WeeklySummary,
} from "@/lib/diary-analysis";
import type { ScheduleFocus, ScheduleSource } from "@/constants/schedule-defaults";
import { parseScheduleSource } from "@/constants/schedule-defaults";

export type IntelligenceConfidence = "insufficient" | "low" | "moderate" | "high";

export const INTELLIGENCE_CONFIDENCE_LEVELS: IntelligenceConfidence[] = [
  "insufficient",
  "low",
  "moderate",
  "high",
];

export type IntelligenceEvidenceType =
  | "treatment_perceived_pattern"
  | "treatment_metric_pattern"
  | "perceived_window_comparison"
  | "metric_window_comparison"
  | "week_summary"
  | "generic_observed";

export type IntelligenceEvidence =
  | TreatmentPerceivedEvidence
  | TreatmentMetricEvidence
  | PerceivedComparisonEvidence
  | MetricComparisonEvidence
  | WeekSummaryEvidence
  | GenericObservedEvidence;

export type TreatmentPerceivedEvidence = {
  readonly type: "treatment_perceived_pattern";
  readonly treatment: DiaryTreatment;
  readonly windowStartCivilKey: string;
  readonly windowEndCivilKey: string;
  readonly occurrences: number;
  readonly evaluatedCount: number;
  readonly positiveCount: number;
  readonly neutralCount: number;
  readonly negativeCount: number;
};

export type TreatmentMetricEvidence = {
  readonly type: "treatment_metric_pattern";
  readonly treatment: DiaryTreatment;
  readonly metric: DiaryPerceptionMetric;
  readonly windowStartCivilKey: string;
  readonly windowEndCivilKey: string;
  readonly sampleCount: number;
  readonly average: number | null;
};

export type PerceivedComparisonEvidence = {
  readonly type: "perceived_window_comparison";
  readonly recentWindowStartCivilKey: string;
  readonly recentWindowEndCivilKey: string;
  readonly previousWindowStartCivilKey: string;
  readonly previousWindowEndCivilKey: string;
  readonly recentSampleCount: number;
  readonly previousSampleCount: number;
  readonly recentAverage: number | null;
  readonly previousAverage: number | null;
  readonly difference: number | null;
};

export type MetricComparisonEvidence = {
  readonly type: "metric_window_comparison";
  readonly metric: DiaryPerceptionMetric;
  readonly recentWindowStartCivilKey: string;
  readonly recentWindowEndCivilKey: string;
  readonly previousWindowStartCivilKey: string;
  readonly previousWindowEndCivilKey: string;
  readonly recentSampleCount: number;
  readonly previousSampleCount: number;
  readonly recentAverage: number | null;
  readonly previousAverage: number | null;
  readonly difference: number | null;
};

export type WeekSummaryEvidence = {
  readonly type: "week_summary";
  readonly weekStartCivilKey: string;
  readonly weekEndCivilKey: string;
  readonly registeredDays: number;
  readonly elapsedDays: number;
  readonly evaluatedCount: number;
};

export type GenericObservedEvidence = {
  readonly type: "generic_observed";
  readonly description: string;
  readonly windowStartCivilKey?: string;
  readonly windowEndCivilKey?: string;
  readonly sampleCount?: number;
  readonly treatment?: DiaryTreatment;
  readonly metric?: DiaryPerceptionMetric;
};

export type IntelligenceSignalId =
  | "treatment_positive_associated"
  | "treatment_negative_associated"
  | "treatment_metric_low_associated"
  | "treatment_metric_high_associated"
  | "recurring_dryness"
  | "recent_perceived_higher"
  | "recent_perceived_lower"
  | "perceived_result_shift"
  | "metric_value_shift"
  | "insufficient_history"
  | "observed_generic";

export type IntelligenceSignal = {
  readonly id: IntelligenceSignalId;
  readonly confidence: IntelligenceConfidence;
  readonly evidence: IntelligenceEvidence;
  readonly summaryKey: string;
};

export type SuggestionApplicability = {
  readonly scheduleSourceApplicable: boolean;
  readonly requiresExplicitConfirmation: true;
  readonly manualOnly: boolean;
};

export const SUGGESTION_APPLICABILITY_NEVER: SuggestionApplicability = {
  scheduleSourceApplicable: false,
  requiresExplicitConfirmation: true,
  manualOnly: true,
};

export type IntelligenceSuggestionId =
  | "review_treatment_frequency"
  | "observe_treatment_response"
  | "review_metric_pattern"
  | "continue_current_pattern"
  | "register_more_history"
  | "note_perceived_result_shift"
  | "generic_no_action";

export type ProposedScheduleChangeDay = (typeof WEEKDAY_KEYS)[number];

export const WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type ProposedScheduleChangeEntry = {
  readonly day: ProposedScheduleChangeDay;
  readonly currentFocus: ScheduleFocus;
  readonly proposedFocus: ScheduleFocus;
};

export type ProposedScheduleChange = {
  readonly changeType: "focus_replacement";
  readonly entries: readonly ProposedScheduleChangeEntry[];
  readonly description: string;
  readonly executable: false;
};

export function emptyProposedScheduleChange(): ProposedScheduleChange {
  return {
    changeType: "focus_replacement",
    entries: Object.freeze([]),
    description: "Nenhuma alteração de cronograma proposta nesta etapa.",
    executable: false,
  };
}

export type IntelligenceSuggestion = {
  readonly id: IntelligenceSuggestionId;
  readonly confidence: IntelligenceConfidence;
  readonly evidence: IntelligenceEvidence;
  readonly summaryKey: string;
  readonly applicability: SuggestionApplicability;
  readonly proposedScheduleChange: ProposedScheduleChange | null;
};

export type SplitWindows = {
  readonly recentWindowStartCivilKey: string;
  readonly recentWindowEndCivilKey: string;
  readonly recentRows: readonly DiaryEntryRow[];
  readonly previousWindowStartCivilKey: string;
  readonly previousWindowEndCivilKey: string;
  readonly previousRows: readonly DiaryEntryRow[];
};

export type IntelligenceOutput = {
  readonly signals: readonly IntelligenceSignal[];
  readonly suggestions: readonly IntelligenceSuggestion[];
  readonly metadata: IntelligenceMetadata;
};

export type IntelligenceMetadata = {
  readonly mainWindowStartCivilKey: string;
  readonly mainWindowEndCivilKey: string;
  readonly evaluatedRecords: number;
  readonly comparisonRecentWindowStartCivilKey: string | null;
  readonly comparisonRecentWindowEndCivilKey: string | null;
  readonly comparisonPreviousWindowStartCivilKey: string | null;
  readonly comparisonPreviousWindowEndCivilKey: string | null;
};

const CIVIL_KEY_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const METRIC_SET = new Set<string>(DIARY_PERCEPTION_METRICS);
const TREATMENT_SET = new Set<string>(DIARY_TREATMENTS);
const PERCEIVED_SET = new Set<string>(DIARY_PERCEIVED_RESULTS);

const MAIN_WINDOW_DAYS = 28;
const RECENT_COMPARISON_DAYS = 14;
const PREVIOUS_COMPARISON_DAYS = 14;

const TREATMENT_MIN_EVALUATED = 5;
const POSITIVE_RATIO_THRESHOLD = 0.7;
const NEGATIVE_RATIO_THRESHOLD = 0.6;

const COMPARISON_MIN_PER_WINDOW = 4;
const COMPARISON_MIN_ABS_DIFFERENCE = 1.0;

const DRYNESS_MIN_SAMPLE = 5;
const DRYNESS_HIGH_AVERAGE_THRESHOLD = 4.0;

const SIGNAL_ORDER_RANK: Record<IntelligenceSignalId, number> = {
  treatment_negative_associated: 0,
  recurring_dryness: 1,
  treatment_positive_associated: 2,
  recent_perceived_lower: 3,
  recent_perceived_higher: 4,
  treatment_metric_low_associated: 5,
  treatment_metric_high_associated: 6,
  perceived_result_shift: 7,
  metric_value_shift: 8,
  insufficient_history: 9,
  observed_generic: 10,
};

function addDaysLocal(base: Date, days: number): Date {
  const t = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12, 0, 0, 0);
  t.setDate(t.getDate() + days);
  return t;
}

function toCivilKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isCivilKeyIntelligence(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = value.match(CIVIL_KEY_RE);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const maxDay = new Date(year, month, 0).getDate();
  return day >= 1 && day <= maxDay;
}

export function parseCivilKeyIntelligenceOrNull(value: unknown): Date | null {
  if (!isCivilKeyIntelligence(value)) return null;
  const match = value.match(CIVIL_KEY_RE)!;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function compareEntryDateAsc(a: DiaryEntryRow, b: DiaryEntryRow): number {
  const ak = isCivilKeyIntelligence(a.entry_date) ? a.entry_date : "";
  const bk = isCivilKeyIntelligence(b.entry_date) ? b.entry_date : "";
  if (ak < bk) return -1;
  if (ak > bk) return 1;
  return 0;
}

export function compareEntryDateDesc(a: DiaryEntryRow, b: DiaryEntryRow): number {
  return compareEntryDateAsc(b, a);
}

export function sortByEntryDateAsc(rows: readonly DiaryEntryRow[]): readonly DiaryEntryRow[] {
  return rows.slice().sort(compareEntryDateAsc);
}

export function sortByEntryDateDesc(rows: readonly DiaryEntryRow[]): readonly DiaryEntryRow[] {
  return rows.slice().sort(compareEntryDateDesc);
}

export function filterRowsInWindow(
  rows: readonly DiaryEntryRow[],
  fromCivilKey: string,
  toCivilKey: string,
): readonly DiaryEntryRow[] {
  if (!isCivilKeyIntelligence(fromCivilKey)) return [];
  if (!isCivilKeyIntelligence(toCivilKey)) return [];
  if (fromCivilKey > toCivilKey) return [];
  return rows.filter((row) => {
    if (!isCivilKeyIntelligence(row.entry_date)) return false;
    return row.entry_date >= fromCivilKey && row.entry_date <= toCivilKey;
  });
}

export function splitRecentAndPreviousWindows(
  rows: readonly DiaryEntryRow[],
  todayReference: Date,
  recentDays: number,
  previousDays: number,
): SplitWindows | null {
  if (!Number.isFinite(recentDays) || recentDays < 1) return null;
  if (!Number.isFinite(previousDays) || previousDays < 1) return null;

  const todayNoon = new Date(
    todayReference.getFullYear(),
    todayReference.getMonth(),
    todayReference.getDate(),
    12,
    0,
    0,
    0,
  );

  const recentEnd = todayNoon;
  const recentStart = addDaysLocal(recentEnd, -(recentDays - 1));
  const previousEnd = addDaysLocal(recentStart, -1);
  const previousStart = addDaysLocal(previousEnd, -(previousDays - 1));

  const recentStartK = toCivilKey(recentStart);
  const recentEndK = toCivilKey(recentEnd);
  const previousStartK = toCivilKey(previousStart);
  const previousEndK = toCivilKey(previousEnd);

  return {
    recentWindowStartCivilKey: recentStartK,
    recentWindowEndCivilKey: recentEndK,
    recentRows: filterRowsInWindow(rows, recentStartK, recentEndK),
    previousWindowStartCivilKey: previousStartK,
    previousWindowEndCivilKey: previousEndK,
    previousRows: filterRowsInWindow(rows, previousStartK, previousEndK),
  };
}

export function isValidPerceivedResult(value: unknown): value is DiaryPerceivedResult {
  return typeof value === "string" && PERCEIVED_SET.has(value);
}

export function isValidDiaryTreatment(value: unknown): value is DiaryTreatment {
  return typeof value === "string" && TREATMENT_SET.has(value);
}

export function isValidPerceptionMetric(value: unknown): value is DiaryPerceptionMetric {
  return typeof value === "string" && METRIC_SET.has(value);
}

export function normalizeTreatmentsArray(treatments: unknown): readonly DiaryTreatment[] {
  if (!Array.isArray(treatments)) return [];
  const out: DiaryTreatment[] = [];
  const seen = new Set<DiaryTreatment>();
  for (const raw of treatments) {
    if (isValidDiaryTreatment(raw) && !seen.has(raw)) {
      seen.add(raw);
      out.push(raw);
    }
  }
  return out;
}

export function pickDeterministicFirst<T>(
  candidates: readonly T[],
  orderBy?: readonly unknown[],
): T | null {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  if (Array.isArray(orderBy) && orderBy.length > 0) return candidates[0];
  return candidates[0];
}

export function mapPerceivedToOrdinal(result: DiaryPerceivedResult): 1 | 2 | 3 | 4 | 5 {
  switch (result) {
    case "Muito ruim":
      return 1;
    case "Ruim":
      return 2;
    case "Neutro":
      return 3;
    case "Bom":
      return 4;
    case "Muito bom":
      return 5;
  }
}

export function getSuggestionApplicability(scheduleSource: unknown): SuggestionApplicability {
  const source = parseScheduleSource(scheduleSource);
  if (source === "own") {
    return {
      scheduleSourceApplicable: false,
      requiresExplicitConfirmation: true,
      manualOnly: true,
    };
  }
  return {
    scheduleSourceApplicable: true,
    requiresExplicitConfirmation: true,
    manualOnly: false,
  };
}

export function buildInsufficientSuggestion(
  evidence: IntelligenceEvidence,
): IntelligenceSuggestion {
  return {
    id: "register_more_history",
    confidence: "insufficient",
    evidence,
    summaryKey: "register_more_history_brief",
    applicability: SUGGESTION_APPLICABILITY_NEVER,
    proposedScheduleChange: null,
  };
}

export function buildInsufficientSignal(evidence: IntelligenceEvidence): IntelligenceSignal {
  return {
    id: "insufficient_history",
    confidence: "insufficient",
    evidence,
    summaryKey: "insufficient_history_brief",
  };
}

export function wrapAnalysisInputs(
  rows: readonly DiaryEntryRow[],
  todayReference: Date,
): readonly [readonly DiaryEntryRow[], Date] {
  return [rows, todayReference] as const;
}

export function evidenceIsCausalityFree(e: IntelligenceEvidence): boolean {
  switch (e.type) {
    case "treatment_perceived_pattern":
    case "treatment_metric_pattern":
    case "perceived_window_comparison":
    case "metric_window_comparison":
    case "week_summary":
    case "generic_observed":
      return true;
    default:
      return false;
  }
}

export function suggestionHasNoAutoApply(s: IntelligenceSuggestion): boolean {
  return s.applicability.requiresExplicitConfirmation === true;
}

export function buildTreatmentMetricEvidence(
  treatment: DiaryTreatment,
  metric: DiaryPerceptionMetric,
  stats: MetricStats,
  windowStartCivilKey: string,
  windowEndCivilKey: string,
): TreatmentMetricEvidence | null {
  if (!isValidDiaryTreatment(treatment)) return null;
  if (!isValidPerceptionMetric(metric)) return null;
  if (!isCivilKeyIntelligence(windowStartCivilKey)) return null;
  if (!isCivilKeyIntelligence(windowEndCivilKey)) return null;
  if (windowStartCivilKey > windowEndCivilKey) return null;
  const sampleCount = Number.isFinite(stats.sampleCount) ? Math.max(0, stats.sampleCount) : 0;
  const avg =
    typeof stats.average === "number" && Number.isFinite(stats.average) ? stats.average : null;
  return {
    type: "treatment_metric_pattern",
    treatment,
    metric,
    windowStartCivilKey,
    windowEndCivilKey,
    sampleCount,
    average: avg,
  };
}

export function buildTreatmentPerceivedEvidenceFromPattern(
  pattern: TreatmentPattern,
  windowStartCivilKey: string,
  windowEndCivilKey: string,
): TreatmentPerceivedEvidence | null {
  if (!isValidDiaryTreatment(pattern.treatment)) return null;
  if (!isCivilKeyIntelligence(windowStartCivilKey)) return null;
  if (!isCivilKeyIntelligence(windowEndCivilKey)) return null;
  if (windowStartCivilKey > windowEndCivilKey) return null;
  return {
    type: "treatment_perceived_pattern",
    treatment: pattern.treatment,
    windowStartCivilKey,
    windowEndCivilKey,
    occurrences: Number.isFinite(pattern.occurrences) ? Math.max(0, pattern.occurrences) : 0,
    evaluatedCount: Number.isFinite(pattern.evaluatedPerceivedCount)
      ? Math.max(0, pattern.evaluatedPerceivedCount)
      : 0,
    positiveCount: Number.isFinite(pattern.positiveCount) ? Math.max(0, pattern.positiveCount) : 0,
    neutralCount: Number.isFinite(pattern.neutralCount) ? Math.max(0, pattern.neutralCount) : 0,
    negativeCount: Number.isFinite(pattern.negativeCount) ? Math.max(0, pattern.negativeCount) : 0,
  };
}

function numberOrNull(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function detectTreatmentPerceivedSignals(
  patterns: readonly TreatmentPattern[],
  windowStartCivilKey: string,
  windowEndCivilKey: string,
): readonly IntelligenceSignal[] {
  const out: IntelligenceSignal[] = [];
  for (const pattern of patterns) {
    const ev = buildTreatmentPerceivedEvidenceFromPattern(
      pattern,
      windowStartCivilKey,
      windowEndCivilKey,
    );
    if (!ev) continue;
    if (ev.evaluatedCount < TREATMENT_MIN_EVALUATED) continue;
    const positiveRatio = ev.evaluatedCount > 0 ? ev.positiveCount / ev.evaluatedCount : 0;
    const negativeRatio = ev.evaluatedCount > 0 ? ev.negativeCount / ev.evaluatedCount : 0;
    const hitsPositive = positiveRatio >= POSITIVE_RATIO_THRESHOLD;
    const hitsNegative = negativeRatio >= NEGATIVE_RATIO_THRESHOLD;
    if (hitsPositive && hitsNegative) continue;
    if (hitsPositive) {
      out.push({
        id: "treatment_positive_associated",
        confidence: "moderate",
        evidence: ev,
        summaryKey: `positive_${pattern.treatment}`,
      });
      continue;
    }
    if (hitsNegative) {
      out.push({
        id: "treatment_negative_associated",
        confidence: "moderate",
        evidence: ev,
        summaryKey: `negative_${pattern.treatment}`,
      });
    }
  }
  return out;
}

function detectRecurringDrynessSignals(
  patterns: readonly TreatmentPattern[],
  windowStartCivilKey: string,
  windowEndCivilKey: string,
): readonly IntelligenceSignal[] {
  const out: IntelligenceSignal[] = [];
  for (const pattern of patterns) {
    const dryness = pattern.metrics.dryness;
    if (!dryness) continue;
    const sc = Number.isFinite(dryness.sampleCount) ? Math.max(0, dryness.sampleCount) : 0;
    const avg = numberOrNull(dryness.average);
    if (sc < DRYNESS_MIN_SAMPLE) continue;
    if (avg === null) continue;
    if (avg < DRYNESS_HIGH_AVERAGE_THRESHOLD) continue;
    const ev = buildTreatmentMetricEvidence(
      pattern.treatment,
      "dryness",
      dryness,
      windowStartCivilKey,
      windowEndCivilKey,
    );
    if (!ev) continue;
    out.push({
      id: "recurring_dryness",
      confidence: "moderate",
      evidence: ev,
      summaryKey: `dryness_${pattern.treatment}`,
    });
  }
  return out;
}

function detectPerceivedComparisonSignal(
  comparison: PerceivedComparison,
  split: SplitWindows,
): IntelligenceSignal | null {
  const recS = Number.isFinite(comparison.overall.recentSampleCount)
    ? Math.max(0, comparison.overall.recentSampleCount)
    : 0;
  const prevS = Number.isFinite(comparison.overall.olderSampleCount)
    ? Math.max(0, comparison.overall.olderSampleCount)
    : 0;
  if (recS < COMPARISON_MIN_PER_WINDOW || prevS < COMPARISON_MIN_PER_WINDOW) return null;
  const diff = numberOrNull(comparison.overall.difference);
  if (diff === null) return null;
  const recAvg = numberOrNull(comparison.overall.recentAverage);
  const prevAvg = numberOrNull(comparison.overall.olderAverage);
  const evidence: PerceivedComparisonEvidence = {
    type: "perceived_window_comparison",
    recentWindowStartCivilKey: split.recentWindowStartCivilKey,
    recentWindowEndCivilKey: split.recentWindowEndCivilKey,
    previousWindowStartCivilKey: split.previousWindowStartCivilKey,
    previousWindowEndCivilKey: split.previousWindowEndCivilKey,
    recentSampleCount: recS,
    previousSampleCount: prevS,
    recentAverage: recAvg,
    previousAverage: prevAvg,
    difference: diff,
  };
  if (diff >= COMPARISON_MIN_ABS_DIFFERENCE) {
    return {
      id: "recent_perceived_higher",
      confidence: "moderate",
      evidence,
      summaryKey: "recent_perceived_higher",
    };
  }
  if (diff <= -COMPARISON_MIN_ABS_DIFFERENCE) {
    return {
      id: "recent_perceived_lower",
      confidence: "moderate",
      evidence,
      summaryKey: "recent_perceived_lower",
    };
  }
  return null;
}

function extractSignalRank(s: IntelligenceSignal): number {
  return SIGNAL_ORDER_RANK[s.id] ?? Number.MAX_SAFE_INTEGER;
}

function extractSignalSortKey(s: IntelligenceSignal): string {
  if (s.evidence.type === "treatment_perceived_pattern") return s.evidence.treatment;
  if (s.evidence.type === "treatment_metric_pattern") return s.evidence.treatment;
  if (s.evidence.type === "perceived_window_comparison") return "perceived_compare";
  if (s.evidence.type === "metric_window_comparison") return s.evidence.metric;
  if (s.evidence.type === "generic_observed" && s.evidence.treatment) return s.evidence.treatment;
  if (s.evidence.type === "generic_observed" && s.evidence.metric) return s.evidence.metric;
  return s.summaryKey ?? "";
}

function compareSignalsDeterministic(a: IntelligenceSignal, b: IntelligenceSignal): number {
  const ra = extractSignalRank(a);
  const rb = extractSignalRank(b);
  if (ra !== rb) return ra - rb;
  const ka = extractSignalSortKey(a);
  const kb = extractSignalSortKey(b);
  if (ka < kb) return -1;
  if (ka > kb) return 1;
  const sa = a.summaryKey;
  const sb = b.summaryKey;
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

export function sortSignalsDeterministically(
  signals: readonly IntelligenceSignal[],
): readonly IntelligenceSignal[] {
  return signals.slice().sort(compareSignalsDeterministic);
}

function convertSignalsToSuggestions(
  signals: readonly IntelligenceSignal[],
): readonly IntelligenceSuggestion[] {
  const applicability: SuggestionApplicability = {
    scheduleSourceApplicable: true,
    requiresExplicitConfirmation: true,
    manualOnly: false,
  };
  return signals.map((s) => {
    if (s.id === "treatment_positive_associated") {
      return {
        id: "continue_current_pattern",
        confidence: s.confidence,
        evidence: s.evidence,
        summaryKey: `continue_${s.summaryKey}`,
        applicability,
        proposedScheduleChange: null,
      } as const satisfies IntelligenceSuggestion;
    }
    if (s.id === "treatment_negative_associated") {
      return {
        id: "observe_treatment_response",
        confidence: s.confidence,
        evidence: s.evidence,
        summaryKey: `observe_${s.summaryKey}`,
        applicability,
        proposedScheduleChange: null,
      } as const satisfies IntelligenceSuggestion;
    }
    if (s.id === "recurring_dryness") {
      return {
        id: "review_metric_pattern",
        confidence: s.confidence,
        evidence: s.evidence,
        summaryKey: `dryness_${s.summaryKey}`,
        applicability,
        proposedScheduleChange: null,
      } as const satisfies IntelligenceSuggestion;
    }
    if (s.id === "recent_perceived_higher" || s.id === "recent_perceived_lower") {
      return {
        id: "note_perceived_result_shift",
        confidence: s.confidence,
        evidence: s.evidence,
        summaryKey: s.summaryKey,
        applicability,
        proposedScheduleChange: null,
      } as const satisfies IntelligenceSuggestion;
    }
    return {
      id: "generic_no_action",
      confidence: s.confidence,
      evidence: s.evidence,
      summaryKey: s.summaryKey,
      applicability,
      proposedScheduleChange: null,
    } as const satisfies IntelligenceSuggestion;
  });
}

export function computeDiaryIntelligence(input: {
  readonly rows: readonly DiaryEntryRow[];
  readonly today: Date;
}): IntelligenceOutput {
  const todayNoon = new Date(
    input.today.getFullYear(),
    input.today.getMonth(),
    input.today.getDate(),
    12,
    0,
    0,
    0,
  );

  const mainEnd = todayNoon;
  const mainStart = addDaysLocal(mainEnd, -(MAIN_WINDOW_DAYS - 1));
  const mainStartK = toCivilKey(mainStart);
  const mainEndK = toCivilKey(mainEnd);
  const mainRows = filterRowsInWindow(input.rows, mainStartK, mainEndK);
  const evaluatedRecords = mainRows.filter((r) =>
    isValidPerceivedResult(r.perceived_result),
  ).length;
  const patterns: TreatmentPatternsResult = computeTreatmentPatterns(mainRows.slice());

  const split = splitRecentAndPreviousWindows(
    input.rows,
    todayNoon,
    RECENT_COMPARISON_DAYS,
    PREVIOUS_COMPARISON_DAYS,
  );

  let comparisonSignal: IntelligenceSignal | null = null;
  let compStartK: string | null = null;
  let compEndK: string | null = null;
  let compPrevStartK: string | null = null;
  let compPrevEndK: string | null = null;
  if (split) {
    compStartK = split.recentWindowStartCivilKey;
    compEndK = split.recentWindowEndCivilKey;
    compPrevStartK = split.previousWindowStartCivilKey;
    compPrevEndK = split.previousWindowEndCivilKey;
    const comp = computePerceivedComparison(split.previousRows.slice(), split.recentRows.slice());
    comparisonSignal = detectPerceivedComparisonSignal(comp, split);
  }

  const treatmentPerceivedSignals = detectTreatmentPerceivedSignals(
    patterns.patterns,
    mainStartK,
    mainEndK,
  );
  const drynessSignals = detectRecurringDrynessSignals(patterns.patterns, mainStartK, mainEndK);
  const combined: IntelligenceSignal[] = [...treatmentPerceivedSignals, ...drynessSignals];
  if (comparisonSignal) combined.push(comparisonSignal);
  const signals = sortSignalsDeterministically(combined);
  const suggestions = convertSignalsToSuggestions(signals);
  return {
    signals,
    suggestions,
    metadata: {
      mainWindowStartCivilKey: mainStartK,
      mainWindowEndCivilKey: mainEndK,
      evaluatedRecords,
      comparisonRecentWindowStartCivilKey: compStartK,
      comparisonRecentWindowEndCivilKey: compEndK,
      comparisonPreviousWindowStartCivilKey: compPrevStartK,
      comparisonPreviousWindowEndCivilKey: compPrevEndK,
    },
  };
}

export function _isIntelligenceConfidenceForTesting(
  value: unknown,
): value is IntelligenceConfidence {
  return (
    typeof value === "string" &&
    (INTELLIGENCE_CONFIDENCE_LEVELS as readonly string[]).includes(value)
  );
}

export const _INTELLIGENCE_THRESHOLDS_FOR_TESTING = {
  MAIN_WINDOW_DAYS,
  TREATMENT_MIN_EVALUATED,
  POSITIVE_RATIO_THRESHOLD,
  NEGATIVE_RATIO_THRESHOLD,
  RECENT_COMPARISON_DAYS,
  PREVIOUS_COMPARISON_DAYS,
  COMPARISON_MIN_PER_WINDOW,
  COMPARISON_MIN_ABS_DIFFERENCE,
  DRYNESS_MIN_SAMPLE,
  DRYNESS_HIGH_AVERAGE_THRESHOLD,
};
