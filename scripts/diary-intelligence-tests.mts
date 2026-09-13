import {
  buildInsufficientSignal,
  buildInsufficientSuggestion,
  buildTreatmentMetricEvidence,
  buildTreatmentPerceivedEvidenceFromPattern,
  compareEntryDateAsc,
  evidenceIsCausalityFree,
  filterRowsInWindow,
  getSuggestionApplicability,
  isCivilKeyIntelligence,
  isValidDiaryTreatment,
  isValidPerceivedResult,
  isValidPerceptionMetric,
  mapPerceivedToOrdinal,
  normalizeTreatmentsArray,
  parseCivilKeyIntelligenceOrNull,
  pickDeterministicFirst,
  sortByEntryDateAsc,
  sortByEntryDateDesc,
  sortSignalsDeterministically,
  splitRecentAndPreviousWindows,
  suggestionHasNoAutoApply,
  wrapAnalysisInputs,
  computeDiaryIntelligence,
  _INTELLIGENCE_THRESHOLDS_FOR_TESTING,
  WEEKDAY_KEYS,
  type IntelligenceConfidence,
  type IntelligenceEvidence,
  type IntelligenceSignal,
  type IntelligenceSuggestion,
  type ProposedScheduleChange,
} from "../src/lib/diary-intelligence";
import type {
  DiaryEntryRow,
  DiaryTreatment,
  DiaryPerceivedResult,
  DiaryPerceptionScale,
} from "../src/types/diary";
import type { TreatmentPattern } from "../src/lib/diary-analysis";
import { DIARY_TREATMENTS } from "../src/types/diary";
import { emptyProposedScheduleChange } from "../src/lib/diary-intelligence";
import { _isIntelligenceConfidenceForTesting } from "../src/lib/diary-intelligence";

let pass = 0;
let total = 0;
let fail = 0;

function test(name: string, fn: () => boolean): void {
  total += 1;
  let ok = false;
  try {
    ok = fn();
  } catch (err) {
    console.error(`INT-TEST THROW: ${name} — ${(err as Error).message}`);
    ok = false;
  }
  if (ok) {
    pass += 1;
    console.log(`INT-${total.toString().padStart(2, "0")} PASS: ${name}`);
  } else {
    fail += 1;
    console.error(`INT-${total.toString().padStart(2, "0")} FAIL: ${name}`);
  }
}

function makeRow(partial: Partial<DiaryEntryRow>): DiaryEntryRow {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    entry_date: "2026-09-10",
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
    scheduled_focus_snapshot: null,
    created_at: new Date(2026, 8, 10, 12, 0, 0, 0).toISOString(),
    updated_at: new Date(2026, 8, 10, 12, 0, 0, 0).toISOString(),
    ...partial,
  } as DiaryEntryRow;
}

function deepFreezeIfObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    for (const v of value) deepFreezeIfObject(v);
    return Object.freeze(value);
  }
  if (
    typeof value === "object" &&
    value !== null &&
    value.constructor === Object
  ) {
    for (const k of Object.keys(value as Record<string, unknown>)) {
      deepFreezeIfObject((value as Record<string, unknown>)[k]);
    }
    return Object.freeze(value);
  }
  return value;
}

function assertTrue(v: unknown, label: string): boolean {
  if (v === true) return true;
  console.error(`  assertTrue failed: ${label} value=${String(v)}`);
  return false;
}
function assertFalse(v: unknown, label: string): boolean {
  return assertTrue(v === false, label);
}
function assertEqual<T>(actual: T, expected: T, label: string): boolean {
  if (Object.is(actual, expected)) return true;
  console.error(
    `  assertEqual failed: ${label} actual=${String(actual)} expected=${String(expected)}`,
  );
  return false;
}
function assertFiniteNumber(
  v: unknown,
  label: string,
  expected: number,
): boolean {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    console.error(`  assertFiniteNumber not finite: ${label} v=${String(v)}`);
    return false;
  }
  if (Math.abs(v - expected) > 1e-9) {
    console.error(
      `  assertFiniteNumber diff: ${label} actual=${String(v)} expected=${String(expected)}`,
    );
    return false;
  }
  return true;
}

console.log("--- INT BEGIN ---");

test("1 civil key válida YYYY-MM-DD", () =>
  assertTrue(isCivilKeyIntelligence("2026-09-10"), "valid 2026-09-10"));

test("2 civil key inválida formato errado", () => {
  const a = assertFalse(isCivilKeyIntelligence("09/10/2026"), "slash");
  const b = assertFalse(isCivilKeyIntelligence("2026-13-01"), "month 13");
  const c = assertFalse(isCivilKeyIntelligence("2026-9-1"), "no pad");
  const d = assertFalse(isCivilKeyIntelligence("20260910"), "no sep");
  const e = assertFalse(isCivilKeyIntelligence("abc"), "letras");
  const f = assertFalse(isCivilKeyIntelligence(""), "empty");
  return a && b && c && d && e && f;
});

test("3 data impossível civil key", () => {
  const a = assertFalse(isCivilKeyIntelligence("2026-02-30"), "fev 30");
  const b = assertFalse(isCivilKeyIntelligence("2024-02-30"), "bissexto fev 30");
  const c = assertFalse(isCivilKeyIntelligence("2026-04-31"), "abr 31");
  const d = assertTrue(isCivilKeyIntelligence("2024-02-29"), "bissexto fev 29 OK");
  return a && b && c && d;
});

test("4 ordenação determinística entry_date", () => {
  const r1 = makeRow({ entry_date: "2026-09-12" });
  const r2 = makeRow({ entry_date: "2026-09-10" });
  const r3 = makeRow({ entry_date: "2026-09-11" });
  const rows = [r1, r2, r3];
  const sortedAsc = sortByEntryDateAsc(rows);
  const sortedDesc = sortByEntryDateDesc(rows);
  return (
    assertEqual(sortedAsc[0].entry_date, "2026-09-10", "asc idx 0") &&
    assertEqual(sortedAsc[1].entry_date, "2026-09-11", "asc idx 1") &&
    assertEqual(sortedAsc[2].entry_date, "2026-09-12", "asc idx 2") &&
    assertEqual(sortedDesc[0].entry_date, "2026-09-12", "desc idx 0") &&
    assertEqual(sortedDesc[2].entry_date, "2026-09-10", "desc idx 2") &&
    assertEqual(compareEntryDateAsc(r1, r1), 0, "compare equal =0")
  );
});

test("5 janela inclui limites corretos", () => {
  const rows = [
    makeRow({ entry_date: "2026-09-01" }),
    makeRow({ entry_date: "2026-09-05" }),
    makeRow({ entry_date: "2026-09-10" }),
  ];
  const w = filterRowsInWindow(rows, "2026-09-05", "2026-09-10");
  return (
    assertEqual(w.length, 2, "size 2") &&
    assertEqual(w[0].entry_date, "2026-09-05", "lower included") &&
    assertEqual(w[1].entry_date, "2026-09-10", "upper included")
  );
});

test("6 janela exclui datas externas", () => {
  const rows = [
    makeRow({ entry_date: "2026-09-01" }),
    makeRow({ entry_date: "2026-09-11" }),
    makeRow({ entry_date: "2026-08-31" }),
  ];
  const w = filterRowsInWindow(rows, "2026-09-02", "2026-09-10");
  return assertEqual(w.length, 0, "nenhum dentro");
});

test("7 entrada vazia filterRows", () => {
  const w = filterRowsInWindow([], "2026-09-01", "2026-09-07");
  const split = splitRecentAndPreviousWindows(
    [],
    new Date(2026, 8, 12, 12, 0, 0, 0),
    7,
    7,
  );
  return (
    assertEqual(w.length, 0, "vazio filter") &&
    assertEqual(split?.recentRows.length, 0, "split recent vazio") &&
    assertEqual(split?.previousRows.length, 0, "split previous vazio")
  );
});

test("8 dados null preservados", () => {
  const r = makeRow({
    perceived_result: null,
    frizz: null,
    shine: null,
    note: null,
    treatments: [],
  });
  return (
    assertEqual(r.perceived_result, null, "perceived null preserved") &&
    assertEqual(r.frizz, null, "frizz null preserved") &&
    assertEqual(parseCivilKeyIntelligenceOrNull(null), null, "parseCivil null→null") &&
    assertEqual(parseCivilKeyIntelligenceOrNull(undefined), null, "parseCivil undef→null")
  );
});

test("9 múltiplos treatments não viram causalidade (semântica associada)", () => {
  const row = makeRow({
    treatments: ["Hidratação", "Nutrição", "Finalização"] as unknown as DiaryTreatment[],
    perceived_result: "Bom" as DiaryPerceivedResult,
  });
  const n = normalizeTreatmentsArray(row.treatments);
  return (
    assertEqual(n.length, 3, "3 treatments") &&
    assertTrue(
      n.every((t) => isValidDiaryTreatment(t)),
      "todos válidos",
    )
  );
});

test("10 evidence separada de suggestion no tipo", () => {
  const evidence: IntelligenceEvidence = {
    type: "generic_observed",
    description: "N observações",
  };
  const sig = buildInsufficientSignal(evidence);
  const sug = buildInsufficientSuggestion(evidence);
  return (
    assertTrue(
      "evidence" in sig && "confidence" in sig && "id" in sig,
      "signal tem evidence separado",
    ) &&
    assertTrue(
      "evidence" in sug && "summaryKey" in sug && "applicability" in sug,
      "sug tem evidence separado",
    ) &&
    assertEqual(sig.confidence, "insufficient", "signal conf insuf") &&
    assertEqual(sug.confidence, "insufficient", "sug conf insuf")
  );
});

test("11 confidence insufficient representável em nível e tipo", () => {
  const confs: IntelligenceConfidence[] = [
    "insufficient",
    "low",
    "moderate",
    "high",
  ];
  return (
    assertTrue(confs.every((c) => _isIntelligenceConfidenceForTesting(c)), "4 níveis OK") &&
    assertFalse(_isIntelligenceConfidenceForTesting("unknown"), "invalido recusado")
  );
});

test("12 insufficient não possui mudança executável", () => {
  const evidence: IntelligenceEvidence = {
    type: "generic_observed",
    description: "poucos dados",
  };
  const sug = buildInsufficientSuggestion(evidence);
  return (
    assertEqual(sug.proposedScheduleChange, null, "change null quando insufficient") &&
    assertFalse(
      sug.applicability.scheduleSourceApplicable,
      "não aplicável"
    )
  );
});

test("13 app exige confirmação explícita", () => {
  const app = getSuggestionApplicability("app");
  return (
    assertTrue(app.requiresExplicitConfirmation, "requires explicit confirmation") &&
    assertTrue(app.scheduleSourceApplicable, "source applicable") &&
    assertFalse(app.manualOnly, "manual only false no app")
  );
});

test("14 own é manual-only", () => {
  const own = getSuggestionApplicability("own");
  return (
    assertTrue(own.manualOnly, "own manualOnly true") &&
    assertFalse(own.scheduleSourceApplicable, "own não source applicable") &&
    assertTrue(own.requiresExplicitConfirmation, "own pede confirmação")
  );
});

test("15 nenhuma aplicação automática (todos requiresExplicit=true)", () => {
  const a = getSuggestionApplicability("app");
  const o = getSuggestionApplicability("own");
  const u = getSuggestionApplicability(undefined);
  return (
    assertTrue(suggestionHasNoAutoApply(buildInsufficientSuggestion({
      type: "generic_observed",
      description: "qualquer",
    })), "sug insufficient requires explicit") &&
    assertTrue(a.requiresExplicitConfirmation && o.requiresExplicitConfirmation && u.requiresExplicitConfirmation, "todos sources requires explicit")
  );
});

test("16 ProposedScheduleChange é apenas descrição (executable:false + entries vazias default)", () => {
  const p: ProposedScheduleChange = emptyProposedScheduleChange();
  return (
    assertFalse(p.executable, "executable false") &&
    assertEqual(p.entries.length, 0, "entries empty por padrão") &&
    assertTrue(typeof p.description === "string" && p.description.length > 0, "description length")
  );
});

test("17 determinismo mesmos inputs = mesmos outputs", () => {
  const today = new Date(2026, 8, 12, 12, 0, 0, 0);
  const rows = [
    makeRow({ entry_date: "2026-09-05" }),
    makeRow({ entry_date: "2026-09-06" }),
  ];
  const s1 = splitRecentAndPreviousWindows(rows, today, 7, 7);
  const s2 = splitRecentAndPreviousWindows(rows, today, 7, 7);
  const w = [rows, rows].map((r) => filterRowsInWindow(r, "2026-09-04", "2026-09-07").length);
  return (
    assertEqual(w[0], w[1], "mesmo resultado window") &&
    assertEqual(s1?.recentWindowStartCivilKey, s2?.recentWindowStartCivilKey, "mesma chave janela") &&
    assertEqual(s1?.previousRows.length, s2?.previousRows.length, "mesmo length previous") &&
    assertEqual(
      pickDeterministicFirst([1, 2, 3]),
      pickDeterministicFirst([1, 2, 3]),
      "pick deterministic first igual"
    )
  );
});

test("18 inputs não são mutados (imutabilidade)", () => {
  const orig = [
    makeRow({
      entry_date: "2026-09-05",
      treatments: ["Hidratação"] as unknown as DiaryTreatment[],
    }),
    makeRow({
      entry_date: "2026-09-06",
      treatments: ["Nutrição"] as unknown as DiaryTreatment[],
    }),
  ];
  deepFreezeIfObject(orig);
  deepFreezeIfObject(orig[0]);
  deepFreezeIfObject(orig[1]);
  const today = new Date(2026, 8, 12, 12, 0, 0, 0);
  try {
    sortByEntryDateAsc(orig);
    sortByEntryDateDesc(orig);
    filterRowsInWindow(orig, "2026-09-01", "2026-09-30");
    splitRecentAndPreviousWindows(orig, today, 7, 7);
    wrapAnalysisInputs(orig, today);
    normalizeTreatmentsArray(orig[0].treatments);
    return true;
  } catch (err) {
    console.error(`  mutabilidade detectada: ${(err as Error).message}`);
    return false;
  }
});

test("19 nenhuma dependência de relógio interno", () => {
  const today = new Date(2026, 0, 1, 12, 0, 0, 0);
  const rows = [
    makeRow({ entry_date: "2025-12-26" }),
    makeRow({ entry_date: "2026-01-01" }),
  ];
  const split = splitRecentAndPreviousWindows(rows, today, 7, 7);
  return (
    assertEqual(split?.recentWindowEndCivilKey, "2026-01-01", "end hoje param, não Date.now") &&
    assertEqual(split?.previousWindowEndCivilKey, "2025-12-25", "prev end 25-12 param-derived")
  );
});

test("20 nenhuma duplicação cálculos diary-analysis (reaproveita tipos e constrói evidência em cima sem recalcular média/positiveCount)", () => {
  const pattern: TreatmentPattern = {
    treatment: DIARY_TREATMENTS[1] ?? ("Hidratação" as DiaryTreatment),
    occurrences: 5,
    evaluatedPerceivedCount: 5,
    positiveCount: 4,
    neutralCount: 1,
    negativeCount: 0,
    metrics: {
      frizz: { average: null, sampleCount: 0 },
      dryness: { average: 4, sampleCount: 3 },
      oiliness: { average: null, sampleCount: 0 },
      definition: { average: null, sampleCount: 0 },
      shine: { average: null, sampleCount: 0 },
      breakage: { average: null, sampleCount: 0 },
    },
    hasEnoughData: true,
    metricsSufficiency: {
      frizz: false,
      dryness: true,
      oiliness: false,
      definition: false,
      shine: false,
      breakage: false,
    },
    perceivedSufficiency: true,
  };
  const patternClone = structuredClone(pattern) as TreatmentPattern;
  const ev = buildTreatmentPerceivedEvidenceFromPattern(
    patternClone,
    "2026-09-01",
    "2026-09-30",
  );
  const ev2 = buildTreatmentMetricEvidence(
    patternClone.treatment,
    "dryness",
    patternClone.metrics.dryness,
    "2026-09-01",
    "2026-09-30",
  );
  return (
    assertTrue(evidenceIsCausalityFree(ev!), "ev type ok sem causalidade") &&
    assertEqual(ev?.positiveCount, patternClone.positiveCount, "positiveCount herdado do pattern") &&
    assertEqual(ev?.evaluatedCount, patternClone.evaluatedPerceivedCount, "evaluated herdado pattern") &&
    assertEqual(ev2?.average, 4, "metric média herdada do MetricStats do diary-analysis") &&
    assertEqual(ev2?.sampleCount, 3, "sampleCount herdado") &&
    assertEqual(pattern.occurrences, 5, "pattern não foi mutado (ocorrencias 5)")
  );
});

function assertBetween(
  v: unknown,
  label: string,
  minInclusive: number,
  maxInclusive: number,
): boolean {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    console.error(`  assertBetween not finite: ${label} v=${String(v)}`);
    return false;
  }
  if (v < minInclusive || v > maxInclusive) {
    console.error(
      `  assertBetween out of range: ${label} actual=${String(v)} min=${String(minInclusive)} max=${String(maxInclusive)}`,
    );
    return false;
  }
  return true;
}

const REFERENCE_TODAY = new Date(2026, 8, 12, 12, 0, 0, 0);

function addDaysFromReference(daysOffset: number): Date {
  const t = new Date(2026, 8, 12, 12, 0, 0, 0);
  t.setDate(t.getDate() + daysOffset);
  return t;
}

function civilKeyFromOffset(daysOffset: number): string {
  const d = addDaysFromReference(daysOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildConsecutiveRowsWith(
  treatmentList: DiaryTreatment[],
  offsetStart: number,
  count: number,
  perceived: DiaryPerceivedResult | null,
  opts?: {
    dryness?: DiaryPerceptionScale | null;
  },
): readonly DiaryEntryRow[] {
  const out: DiaryEntryRow[] = [];
  for (let i = 0; i < count; i += 1) {
    const offset = offsetStart - i;
    const key = civilKeyFromOffset(offset);
    out.push(
      makeRow({
        entry_date: key,
        treatments: treatmentList.slice() as unknown as DiaryTreatment[],
        perceived_result: perceived,
        dryness: opts?.dryness ?? null,
      }),
    );
  }
  return out;
}

function hasSignalId(signals: readonly IntelligenceSignal[], id: string, treatment?: string): boolean {
  return signals.some(
    (s) =>
      s.id === id &&
      (!treatment ||
        (s.evidence.type === "treatment_perceived_pattern" && s.evidence.treatment === treatment) ||
        (s.evidence.type === "treatment_metric_pattern" && s.evidence.treatment === treatment)),
  );
}

function countSignalId(signals: readonly IntelligenceSignal[], id: string): number {
  return signals.filter((s) => s.id === id).length;
}

test("21 4 avaliados tratamento → nenhum sinal", () => {
  const rows = buildConsecutiveRowsWith(["Hidratação"], 0, 4, "Bom" as DiaryPerceivedResult);
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  return assertEqual(countSignalId(r.signals, "treatment_positive_associated"), 0, "positive 0") &&
    assertEqual(countSignalId(r.signals, "treatment_negative_associated"), 0, "negative 0");
});

test("22 5 avaliados e 70%+ positivo possível → positivo associado", () => {
  const r1 = buildConsecutiveRowsWith(["Hidratação"], 0, 4, "Bom" as DiaryPerceivedResult);
  const r2 = buildConsecutiveRowsWith(["Hidratação"], -4, 1, "Neutro" as DiaryPerceivedResult);
  const rows = [...r1, ...r2];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  return assertTrue(hasSignalId(r.signals, "treatment_positive_associated", "Hidratação"), "positive Hidratação") &&
    assertEqual(r.signals[0]?.confidence, "moderate", "confidence moderate");
});

test("23 threshold positivo exato 70% → positivo", () => {
  const rows1 = buildConsecutiveRowsWith(["Nutrição"], 0, 7, "Bom" as DiaryPerceivedResult);
  const rows2 = buildConsecutiveRowsWith(["Nutrição"], -7, 3, "Neutro" as DiaryPerceivedResult);
  const rows = [...rows1, ...rows2];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  return assertTrue(hasSignalId(r.signals, "treatment_positive_associated", "Nutrição"), "positive Nutrição 70%");
});

test("24 abaixo threshold positivo 60% → nenhum", () => {
  const rows1 = buildConsecutiveRowsWith(["Nutrição"], 0, 6, "Bom" as DiaryPerceivedResult);
  const rows2 = buildConsecutiveRowsWith(["Nutrição"], -6, 4, "Neutro" as DiaryPerceivedResult);
  const rows = [...rows1, ...rows2];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  return assertFalse(hasSignalId(r.signals, "treatment_positive_associated", "Nutrição"), "sem positive abaixo threshold");
});

test("25 threshold negativo exato 60% → negative associado", () => {
  const rows1 = buildConsecutiveRowsWith(["Reconstrução"], 0, 3, "Ruim" as DiaryPerceivedResult);
  const rows2 = buildConsecutiveRowsWith(["Reconstrução"], -3, 3, "Muito ruim" as DiaryPerceivedResult);
  const rows3 = buildConsecutiveRowsWith(["Reconstrução"], -6, 4, "Neutro" as DiaryPerceivedResult);
  const rows = [...rows1, ...rows2, ...rows3];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  return assertTrue(hasSignalId(r.signals, "treatment_negative_associated", "Reconstrução"), "negative Reconstrução exato 60%");
});

test("26 abaixo threshold negativo 40% → nenhum", () => {
  const rows1 = buildConsecutiveRowsWith(["Reconstrução"], 0, 2, "Ruim" as DiaryPerceivedResult);
  const rows2 = buildConsecutiveRowsWith(["Reconstrução"], -2, 3, "Neutro" as DiaryPerceivedResult);
  const rows = [...rows1, ...rows2];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  return assertFalse(hasSignalId(r.signals, "treatment_negative_associated", "Reconstrução"), "sem negative abaixo threshold");
});

test("27 positivo/negativo não simultâneos no mesmo tratamento", () => {
  const rows1 = buildConsecutiveRowsWith(["Umectação"], 0, 4, "Bom" as DiaryPerceivedResult);
  const rows2 = buildConsecutiveRowsWith(["Umectação"], -4, 3, "Ruim" as DiaryPerceivedResult);
  const rows3 = buildConsecutiveRowsWith(["Umectação"], -7, 3, "Neutro" as DiaryPerceivedResult);
  const rows = [...rows1, ...rows2, ...rows3];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  const pos = hasSignalId(r.signals, "treatment_positive_associated", "Umectação");
  const neg = hasSignalId(r.signals, "treatment_negative_associated", "Umectação");
  return assertFalse(pos && neg, "não simultâneos");
});

test("28 múltiplos tratamentos continuam associação sem causalidade (ambos entram se atingirem threshold)", () => {
  const rowsA = buildConsecutiveRowsWith(["Hidratação"], 0, 5, "Muito bom" as DiaryPerceivedResult);
  const rowsB = buildConsecutiveRowsWith(["Nutrição"], -5, 5, "Muito bom" as DiaryPerceivedResult);
  const rows = [...rowsA, ...rowsB];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  return assertTrue(hasSignalId(r.signals, "treatment_positive_associated", "Hidratação"), "Hidratação positive") &&
    assertTrue(hasSignalId(r.signals, "treatment_positive_associated", "Nutrição"), "Nutrição positive");
});

test("29 14+14 comparação ambas 4 válidos → comparação calculada", () => {
  const prev = buildConsecutiveRowsWith(["Hidratação"], -14, 4, "Neutro" as DiaryPerceivedResult);
  const rec = buildConsecutiveRowsWith(["Hidratação"], 0, 4, "Neutro" as DiaryPerceivedResult);
  const rows = [...prev, ...rec];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  return assertEqual(r.metadata.comparisonRecentWindowStartCivilKey, civilKeyFromOffset(-13), "recent start") &&
    assertEqual(r.metadata.comparisonPreviousWindowEndCivilKey, civilKeyFromOffset(-14), "prev end") &&
    assertEqual(r.signals.length, 0, "sem comparação pequena diff");
});

test("30 comparação diferença +1.0 → recent higher", () => {
  const prev = buildConsecutiveRowsWith(["Hidratação"], -14, 4, "Neutro" as DiaryPerceivedResult);
  const rec = buildConsecutiveRowsWith(["Hidratação"], 0, 4, "Bom" as DiaryPerceivedResult);
  const rows = [...prev, ...rec];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  return assertTrue(hasSignalId(r.signals, "recent_perceived_higher"), "higher +1.0") &&
    assertEqual(countSignalId(r.signals, "recent_perceived_lower"), 0, "sem lower");
});

test("31 comparação diferença -1.0 → recent lower", () => {
  const prev = buildConsecutiveRowsWith(["Hidratação"], -14, 4, "Bom" as DiaryPerceivedResult);
  const rec = buildConsecutiveRowsWith(["Hidratação"], 0, 4, "Neutro" as DiaryPerceivedResult);
  const rows = [...prev, ...rec];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  return assertTrue(hasSignalId(r.signals, "recent_perceived_lower"), "lower -1.0") &&
    assertEqual(countSignalId(r.signals, "recent_perceived_higher"), 0, "sem higher");
});

test("32 diferença +0.99 → nenhum sinal comparação", () => {
  const prevA = buildConsecutiveRowsWith(["Hidratação"], -14, 1, "Ruim" as DiaryPerceivedResult);
  const prevB = buildConsecutiveRowsWith(["Hidratação"], -15, 3, "Neutro" as DiaryPerceivedResult);
  const recA = buildConsecutiveRowsWith(["Hidratação"], 0, 1, "Bom" as DiaryPerceivedResult);
  const recB = buildConsecutiveRowsWith(["Hidratação"], -1, 3, "Neutro" as DiaryPerceivedResult);
  const rows = [...prevA, ...prevB, ...recA, ...recB];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  return assertEqual(countSignalId(r.signals, "recent_perceived_higher"), 0, "sem higher +0.99") &&
    assertEqual(countSignalId(r.signals, "recent_perceived_lower"), 0, "sem lower +0.99");
});

test("33 diferença -0.99 → nenhum sinal comparação", () => {
  const prevA = buildConsecutiveRowsWith(["Hidratação"], -14, 1, "Bom" as DiaryPerceivedResult);
  const prevB = buildConsecutiveRowsWith(["Hidratação"], -15, 3, "Neutro" as DiaryPerceivedResult);
  const recA = buildConsecutiveRowsWith(["Hidratação"], 0, 1, "Ruim" as DiaryPerceivedResult);
  const recB = buildConsecutiveRowsWith(["Hidratação"], -1, 3, "Neutro" as DiaryPerceivedResult);
  const rows = [...prevA, ...prevB, ...recA, ...recB];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  return assertEqual(countSignalId(r.signals, "recent_perceived_higher"), 0, "sem higher -0.99") &&
    assertEqual(countSignalId(r.signals, "recent_perceived_lower"), 0, "sem lower -0.99");
});

test("34 janela anterior <4 válidos → nenhum comparação", () => {
  const prev = buildConsecutiveRowsWith(["Hidratação"], -14, 3, "Bom" as DiaryPerceivedResult);
  const rec = buildConsecutiveRowsWith(["Hidratação"], 0, 4, "Bom" as DiaryPerceivedResult);
  const rows = [...prev, ...rec];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  return assertEqual(countSignalId(r.signals, "recent_perceived_higher") + countSignalId(r.signals, "recent_perceived_lower"), 0, "sem sinal prev<4");
});

test("35 janela recente <4 válidos → nenhum comparação", () => {
  const prev = buildConsecutiveRowsWith(["Hidratação"], -14, 4, "Bom" as DiaryPerceivedResult);
  const rec = buildConsecutiveRowsWith(["Hidratação"], 0, 3, "Bom" as DiaryPerceivedResult);
  const rows = [...prev, ...rec];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  return assertEqual(countSignalId(r.signals, "recent_perceived_higher") + countSignalId(r.signals, "recent_perceived_lower"), 0, "sem sinal rec<4");
});

test("36 null perceived não entra denominador evaluatedCount", () => {
  const withPerceived = buildConsecutiveRowsWith(["Hidratação"], 0, 3, "Bom" as DiaryPerceivedResult);
  const nullPerceived = buildConsecutiveRowsWith(["Hidratação"], -3, 10, null);
  const rows = [...withPerceived, ...nullPerceived];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  return assertFalse(hasSignalId(r.signals, "treatment_positive_associated", "Hidratação"), "sem positive pois 3 avaliados <5") &&
    assertFiniteNumber(r.metadata.evaluatedRecords, 3, 3);
});

test("37 ordem determinística dos sinais (negative → dryness → positive → lower → higher, tratamentos alfabéticos)", () => {
  const multiDays: DiaryEntryRow[] = [];
  for (let i = 0; i < 5; i += 1) {
    const off = -14 - i;
    const k = civilKeyFromOffset(off);
    multiDays.push(
      makeRow({
        entry_date: k,
        treatments: ["Hidratação"] as unknown as DiaryTreatment[],
        perceived_result: "Bom" as DiaryPerceivedResult,
      }),
      makeRow({
        entry_date: k,
        treatments: ["Nutrição"] as unknown as DiaryTreatment[],
        perceived_result: "Ruim" as DiaryPerceivedResult,
      }),
      makeRow({
        entry_date: k,
        treatments: ["Umectação"] as unknown as DiaryTreatment[],
        perceived_result: "Bom" as DiaryPerceivedResult,
        dryness: 5 as DiaryPerceptionScale,
      }),
    );
  }
  const prev = buildConsecutiveRowsWith(["Finalização"], -19, 4, "Ruim" as DiaryPerceivedResult);
  const rec = buildConsecutiveRowsWith(["Finalização"], 0, 4, "Muito bom" as DiaryPerceivedResult);
  const rows = [...multiDays, ...prev, ...rec];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  const orderIds = r.signals.map((s) => s.id);
  return assertTrue(r.signals.length >= 4, "sinais suficientes") &&
    assertEqual(r.signals[0].id, "treatment_negative_associated", "primeiro negative") &&
    assertEqual(r.signals[r.signals.length - 1].id, "recent_perceived_higher", "último higher") &&
    assertEqual(orderIds.indexOf("treatment_negative_associated") < orderIds.indexOf("recurring_dryness"), true, "negative antes dryness") &&
    assertEqual(orderIds.indexOf("recurring_dryness") < orderIds.indexOf("treatment_positive_associated"), true, "dryness antes positive");
});

test("38 mesmas rows ordem diferente → resultado equivalente", () => {
  const rA = buildConsecutiveRowsWith(["Hidratação"], 0, 5, "Bom" as DiaryPerceivedResult);
  const rB = buildConsecutiveRowsWith(["Nutrição"], -5, 5, "Bom" as DiaryPerceivedResult);
  const rows1 = [...rA, ...rB];
  const rows2 = [...rB, ...rA];
  const r1 = computeDiaryIntelligence({ rows: rows1, today: REFERENCE_TODAY });
  const r2 = computeDiaryIntelligence({ rows: rows2, today: REFERENCE_TODAY });
  return assertEqual(r1.signals.length, r2.signals.length, "length igual") &&
    assertEqual(r1.signals.map((s) => s.id).join(","), r2.signals.map((s) => s.id).join(","), "ids iguais") &&
    assertEqual(r1.suggestions.length, r2.suggestions.length, "sug length igual");
});

test("39 suggestions proposedScheduleChange=null para todas", () => {
  const hidr = buildConsecutiveRowsWith(["Hidratação"], 0, 5, "Bom" as DiaryPerceivedResult);
  const r = computeDiaryIntelligence({ rows: hidr, today: REFERENCE_TODAY });
  return assertTrue(r.suggestions.length >= 1, "sug existe") &&
    assertTrue(r.suggestions.every((s) => s.proposedScheduleChange === null), "sem change proposto");
});

test("40 nenhum texto causal proibido nos IDs/evidence keys", () => {
  const hidr = buildConsecutiveRowsWith(["Hidratação"], 0, 5, "Bom" as DiaryPerceivedResult);
  const r = computeDiaryIntelligence({ rows: hidr, today: REFERENCE_TODAY });
  const haystack = JSON.stringify({
    signals: r.signals,
    suggestions: r.suggestions,
  });
  const banned = ["causedBy", "responsibleFor", "treatmentCaused", "causalEffect", "funcionou", "piorou", "melhorou"];
  return assertTrue(banned.every((b) => !haystack.includes(b)), "nenhuma palavra causal");
});

test("41 nenhum auto-apply: suggestions requiresExplicitConfirmation=true", () => {
  const hidr = buildConsecutiveRowsWith(["Hidratação"], 0, 5, "Ruim" as DiaryPerceivedResult);
  const r = computeDiaryIntelligence({ rows: hidr, today: REFERENCE_TODAY });
  return assertTrue(r.suggestions.length >= 1, "sug exist") &&
    assertTrue(r.suggestions.every((s) => s.applicability.requiresExplicitConfirmation), "todas explicit");
});

test("42 inputs não mutados quando passa deepFrozen para computeDiaryIntelligence", () => {
  const hidr = buildConsecutiveRowsWith(["Hidratação"], 0, 5, "Bom" as DiaryPerceivedResult);
  deepFreezeIfObject(hidr);
  for (const r of hidr) deepFreezeIfObject(r);
  try {
    computeDiaryIntelligence({ rows: hidr, today: REFERENCE_TODAY });
    sortSignalsDeterministically([]);
    return true;
  } catch (err) {
    console.error(`  mutabilidade detectada compute: ${(err as Error).message}`);
    return false;
  }
});

test("43 recurring dryness média 4.5 sample 5 → sinal recurring_dryness", () => {
  const r1 = buildConsecutiveRowsWith(["Umectação"], 0, 3, "Bom" as DiaryPerceivedResult, { dryness: 5 as DiaryPerceptionScale });
  const r2 = buildConsecutiveRowsWith(["Umectação"], -3, 2, "Neutro" as DiaryPerceivedResult, { dryness: 4 as DiaryPerceptionScale });
  const rows = [...r1, ...r2];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  return assertTrue(hasSignalId(r.signals, "recurring_dryness", "Umectação"), "recurring dryness ativado") &&
    assertEqual(r.signals.find((s) => s.id === "recurring_dryness")?.confidence, "moderate", "dryness moderate");
});

test("44 recurring dryness média 3.5 → nenhum sinal", () => {
  const r1 = buildConsecutiveRowsWith(["Umectação"], 0, 5, "Bom" as DiaryPerceivedResult, { dryness: 3 as DiaryPerceptionScale });
  const r2 = buildConsecutiveRowsWith(["Umectação"], -5, 5, "Bom" as DiaryPerceivedResult, { dryness: 4 as DiaryPerceptionScale });
  const rows = [...r1, ...r2];
  const r = computeDiaryIntelligence({ rows, today: REFERENCE_TODAY });
  return assertFalse(hasSignalId(r.signals, "recurring_dryness", "Umectação"), "dryness avg 3.5 abaixo 4.0");
});

test("45 recurring dryness sample 4 → nenhum sinal", () => {
  const r1 = buildConsecutiveRowsWith(["Umectação"], 0, 4, "Bom" as DiaryPerceivedResult, { dryness: 5 as DiaryPerceptionScale });
  const r = computeDiaryIntelligence({ rows: r1, today: REFERENCE_TODAY });
  return assertFalse(hasSignalId(r.signals, "recurring_dryness", "Umectação"), "dryness insuf sample");
});

const totalInt = total;
const passInt = pass;
const failInt = fail;

console.log("--- INT END ---");
console.log(
  `Resultado: ${passInt}/${totalInt} testes fundação inteligência. Failures=${failInt}`,
);

if (failInt > 0) {
  console.error("DIARY_INTELLIGENCE_STATIC_FAIL");
  process.exit(1);
}
console.log("DIARY_INTELLIGENCE_STATIC_OK");
process.exit(0);
