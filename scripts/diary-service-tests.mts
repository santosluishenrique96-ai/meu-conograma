import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types";

const SUPABASE_URL_FOR_CLIENT = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) as
  | string
  | undefined;
const SUPABASE_KEY_FOR_CLIENT = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY) as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

const hasSupabaseIntegrationEnv =
  Boolean(SUPABASE_URL_FOR_CLIENT) &&
  Boolean(SUPABASE_KEY_FOR_CLIENT) &&
  Boolean(SUPABASE_SERVICE_ROLE_KEY);

const RUN_INTEGRATION = hasSupabaseIntegrationEnv && process.env.DIARY_TEST_NO_INTEGRATION !== "1";

import {
  buildScheduleFocusSnapshot,
  getDiaryEntryByDate,
  listDiaryEntries,
  normalizeISODate,
  parseSavedScheduleSnapshot,
  upsertDiaryEntry,
  validatePayloadShape,
  validateTreatments,
} from "../src/services/diary";
import {
  computePerceivedComparison,
  computeTreatmentPatterns,
  computeWeeklySummary,
  type TreatmentPatternsResult,
  type WeeklySummary,
} from "../src/lib/diary-analysis";
import type { DiaryEntryRow, DiaryTreatment } from "../src/types/diary";
import type { SchedulePrefsWithSource } from "../src/constants/schedule-defaults";

let supabase: SupabaseClient<Database> | undefined;

if (RUN_INTEGRATION) {
  if (hasSupabaseIntegrationEnv) {
    try {
      // Import adia o side effect de inicialização só quando realmente há credenciais.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { supabase: _anonClient } = require("../src/integrations/supabase/client") as {
        supabase: unknown;
      };
      void (_anonClient as { auth: unknown }).auth;
      supabase = _anonClient as SupabaseClient<Database>;
    } catch {
      supabase = createClient<Database>(
        SUPABASE_URL_FOR_CLIENT as string,
        SUPABASE_KEY_FOR_CLIENT as string,
        {
          auth: {
            storage: undefined,
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );
    }
  }
}

function createSvc(): SupabaseClient<Database> {
  if (!hasSupabaseIntegrationEnv) {
    throw new Error("createSvc: credenciais Supabase não disponíveis");
  }
  return createClient<Database>(
    SUPABASE_URL_FOR_CLIENT as string,
    SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const TEST_PASSWORD = `Tst!${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

async function provision(svc: SupabaseClient<Database>): Promise<{ id: string; email: string }> {
  const email = `diary-test-${Date.now()}-${Math.floor(Math.random() * 10_000)}@meuconograma.test`;
  const { data, error } = await svc.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  if (!data.user) throw new Error("fail create user");
  return { id: data.user.id, email };
}

async function loginUser(email: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error) throw error;
  return data;
}

async function cleanup(svc: SupabaseClient<Database>, userId: string) {
  try {
    await svc.from("diary_entries").delete().eq("user_id", userId);
  } catch {
    /* ignore */
  }
  try {
    await svc.from("schedule_preferences").delete().eq("user_id", userId);
  } catch {
    /* ignore */
  }
  try {
    await svc.from("user_subscription_state").delete().eq("user_id", userId);
  } catch {
    /* ignore */
  }
  try {
    await svc.auth.admin.deleteUser(userId);
  } catch {
    /* ignore */
  }
  try {
    await supabase.auth.signOut();
  } catch {
    /* ignore */
  }
}

function makeMinimalRow(opts: {
  entry_date: string;
  treatments?: DiaryTreatment[];
  perceived_result?: DiaryEntryRow["perceived_result"] | null;
  frizz?: number | null;
  dryness?: number | null;
  oiliness?: number | null;
  definition?: number | null;
  shine?: number | null;
  breakage?: number | null;
}): DiaryEntryRow {
  return {
    id: `id-${Math.random().toString(36).slice(2, 12)}`,
    user_id: "test-user-static-analysis",
    entry_date: opts.entry_date,
    treatments: opts.treatments ?? [],
    perceived_result: opts.perceived_result ?? null,
    frizz: opts.frizz ?? null,
    dryness: opts.dryness ?? null,
    oiliness: opts.oiliness ?? null,
    definition: opts.definition ?? null,
    shine: opts.shine ?? null,
    breakage: opts.breakage ?? null,
    note: null,
    evolution_photo_id: null,
    scheduled_focus_snapshot: null,
    created_at: new Date(2026, 0, 1, 12).toISOString(),
    updated_at: new Date(2026, 0, 1, 12).toISOString(),
  } as DiaryEntryRow;
}

function assertFiniteNumber(label: string, value: number | null | undefined, expected: number | null) {
  if (expected === null) {
    if (value !== null) throw new Error(`${label} expected null got ${String(value)}`);
    return;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} expected finite number got ${String(value)}`);
  }
  if (Math.abs(value - expected) > 1e-9) {
    throw new Error(`${label} expected ${expected} got ${value}`);
  }
}

function runAnalysisStaticTests() {
  console.log("ANA-A computeWeeklySummary zero rows → zeros/empty states, sem NaN");
  {
    const monday = new Date(2026, 8, 14, 12, 0, 0, 0);
    const s = computeWeeklySummary([], monday);
    if (s.registeredDays !== 0) throw new Error(`zero rows registeredDays: ${s.registeredDays}`);
    if (s.elapsedDays !== 1) throw new Error(`segunda-feira elapsedDays: ${s.elapsedDays}`);
    if (s.perceived.evaluatedCount !== 0) throw new Error(`evaluatedCount zero: ${s.perceived.evaluatedCount}`);
    if (s.perceived.positive + s.perceived.neutral + s.perceived.negative !== 0) {
      throw new Error(`pnz sum: ${s.perceived.positive + s.perceived.neutral + s.perceived.negative}`);
    }
    for (const m of ["frizz", "dryness", "oiliness", "definition", "shine", "breakage"] as const) {
      if (s.metrics[m].average !== null) {
        throw new Error(`${m} average não null: ${String(s.metrics[m].average)}`);
      }
      if (s.metrics[m].sampleCount !== 0) {
        throw new Error(`${m} sampleCount não 0: ${s.metrics[m].sampleCount}`);
      }
    }
    const anyNaN =
      Number.isNaN(s.registeredDays) ||
      Number.isNaN(s.elapsedDays) ||
      Number.isNaN(s.perceived.evaluatedCount);
    if (anyNaN) throw new Error("NaN em zero rows");
  }

  console.log("ANA-B segunda-feira como today → elapsedDays=1");
  {
    const segunda = new Date(2026, 8, 14, 12, 0, 0, 0);
    const rows = [
      makeMinimalRow({ entry_date: "2026-09-14", treatments: ["Lavagem"] }),
    ];
    const s = computeWeeklySummary(rows, segunda);
    if (s.elapsedDays !== 1) throw new Error(`seg elapsed: ${s.elapsedDays}`);
    if (s.registeredDays !== 1) throw new Error(`seg registeredDays: ${s.registeredDays}`);
    if (s.weekStartCivilKey !== "2026-09-14") {
      throw new Error(`weekStart: ${s.weekStartCivilKey}`);
    }
    if (s.weekEndCivilKey !== "2026-09-20") {
      throw new Error(`weekEnd: ${s.weekEndCivilKey}`);
    }
  }

  console.log("ANA-C domingo = 7 dias transcorridos");
  {
    const domingo = new Date(2026, 8, 20, 12, 0, 0, 0);
    const rows: DiaryEntryRow[] = [];
    const s = computeWeeklySummary(rows, domingo);
    if (s.elapsedDays !== 7) throw new Error(`domingo elapsed: ${s.elapsedDays}`);
    if (s.weekStartCivilKey !== "2026-09-14") {
      throw new Error(`domingo weekStart: ${s.weekStartCivilKey}`);
    }
  }

  console.log("ANA-D perceived_result null excluído do denominador");
  {
    const quarta = new Date(2026, 8, 16, 12, 0, 0, 0);
    const rows = [
      makeMinimalRow({ entry_date: "2026-09-14", perceived_result: null, treatments: ["Lavagem"] }),
      makeMinimalRow({ entry_date: "2026-09-15", perceived_result: "Bom" }),
      makeMinimalRow({ entry_date: "2026-09-16", perceived_result: null }),
    ];
    const s = computeWeeklySummary(rows, quarta);
    if (s.perceived.evaluatedCount !== 1) {
      throw new Error(`evaluatedCount deveria ser 1: ${s.perceived.evaluatedCount}`);
    }
    if (s.perceived.positive !== 1 || s.perceived.neutral !== 0 || s.perceived.negative !== 0) {
      throw new Error(
        `pnz: pos=${s.perceived.positive} neu=${s.perceived.neutral} neg=${s.perceived.negative}`,
      );
    }
  }

  console.log("ANA-E métrica null excluída da média, não vira zero");
  {
    const hoje = new Date(2026, 8, 16, 12, 0, 0, 0);
    const rows = [
      makeMinimalRow({ entry_date: "2026-09-14", frizz: 3, dryness: null }),
      makeMinimalRow({ entry_date: "2026-09-15", frizz: null, dryness: 5 }),
      makeMinimalRow({ entry_date: "2026-09-16", frizz: null, dryness: null }),
    ];
    const s = computeWeeklySummary(rows, hoje);
    assertFiniteNumber("frizz avg", s.metrics.frizz.average, 3);
    if (s.metrics.frizz.sampleCount !== 1) throw new Error(`frizz sample: ${s.metrics.frizz.sampleCount}`);
    assertFiniteNumber("dryness avg", s.metrics.dryness.average, 5);
    if (s.metrics.dryness.sampleCount !== 1) {
      throw new Error(`dryness sample: ${s.metrics.dryness.sampleCount}`);
    }
  }

  console.log("ANA-F média correta de valores 1-5 (múltiplas amostras)");
  {
    const hoje = new Date(2026, 8, 18, 12, 0, 0, 0);
    const rows = [
      makeMinimalRow({ entry_date: "2026-09-14", shine: 4 }),
      makeMinimalRow({ entry_date: "2026-09-15", shine: 2 }),
      makeMinimalRow({ entry_date: "2026-09-16", shine: 5 }),
      makeMinimalRow({ entry_date: "2026-09-17", shine: null }),
    ];
    const s = computeWeeklySummary(rows, hoje);
    assertFiniteNumber("shine avg", s.metrics.shine.average, (4 + 2 + 5) / 3);
    if (s.metrics.shine.sampleCount !== 3) {
      throw new Error(`shine sample: ${s.metrics.shine.sampleCount}`);
    }
  }

  console.log("ANA-G positive Bom/Muito bom");
  {
    const hoje = new Date(2026, 8, 18, 12);
    const rows = [
      makeMinimalRow({ entry_date: "2026-09-14", perceived_result: "Bom" }),
      makeMinimalRow({ entry_date: "2026-09-15", perceived_result: "Muito bom" }),
      makeMinimalRow({ entry_date: "2026-09-16", perceived_result: "Neutro" }),
      makeMinimalRow({ entry_date: "2026-09-17", perceived_result: "Ruim" }),
      makeMinimalRow({ entry_date: "2026-09-18", perceived_result: "Muito ruim" }),
    ];
    const s = computeWeeklySummary(rows, hoje);
    if (s.perceived.positive !== 2) throw new Error(`pos: ${s.perceived.positive}`);
    if (s.perceived.neutral !== 1) throw new Error(`neu: ${s.perceived.neutral}`);
    if (s.perceived.negative !== 2) throw new Error(`neg: ${s.perceived.negative}`);
    if (s.perceived.evaluatedCount !== 5) {
      throw new Error(`evaluatedCount: ${s.perceived.evaluatedCount}`);
    }
  }

  console.log("ANA-H neutral Neutro");
  {
    const hoje = new Date(2026, 8, 15, 12);
    const rows = [
      makeMinimalRow({ entry_date: "2026-09-14", perceived_result: "Neutro" }),
      makeMinimalRow({ entry_date: "2026-09-15", perceived_result: "Neutro" }),
    ];
    const s = computeWeeklySummary(rows, hoje);
    if (s.perceived.neutral !== 2 || s.perceived.positive !== 0 || s.perceived.negative !== 0) {
      throw new Error(
        `neutral pure: neu=${s.perceived.neutral} pos=${s.perceived.positive} neg=${s.perceived.negative}`,
      );
    }
  }

  console.log("ANA-I negative Ruim/Muito ruim");
  {
    const hoje = new Date(2026, 8, 16, 12);
    const rows = [
      makeMinimalRow({ entry_date: "2026-09-14", perceived_result: "Ruim" }),
      makeMinimalRow({ entry_date: "2026-09-15", perceived_result: "Muito ruim" }),
      makeMinimalRow({ entry_date: "2026-09-16", perceived_result: "Bom" }),
    ];
    const s = computeWeeklySummary(rows, hoje);
    if (s.perceived.negative !== 2) throw new Error(`neg: ${s.perceived.negative}`);
    if (s.perceived.positive !== 1) throw new Error(`pos: ${s.perceived.positive}`);
  }

  console.log("ANA-J múltiplos treatments no mesmo dia → todos contam (co-ocorrência factual)");
  {
    const hoje = new Date(2026, 8, 16, 12);
    const rows = [
      makeMinimalRow({
        entry_date: "2026-09-14",
        treatments: ["Lavagem", "Hidratação", "Finalização"],
      }),
      makeMinimalRow({
        entry_date: "2026-09-15",
        treatments: ["Lavagem", "Nutrição", "Finalização"],
      }),
      makeMinimalRow({ entry_date: "2026-09-16", treatments: ["Umectação"] }),
    ];
    const s = computeWeeklySummary(rows, hoje);
    if (s.treatmentCounts["Lavagem"] !== 2) {
      throw new Error(`Lavagem count: ${s.treatmentCounts["Lavagem"]}`);
    }
    if (s.treatmentCounts["Finalização"] !== 2) {
      throw new Error(`Finalização count: ${s.treatmentCounts["Finalização"]}`);
    }
    if (s.treatmentCounts["Umectação"] !== 1) {
      throw new Error(`Umectação count: ${s.treatmentCounts["Umectação"]}`);
    }
    if (s.treatmentCounts["Reconstrução"] !== 0) {
      throw new Error(`Reconstrução indevido: ${s.treatmentCounts["Reconstrução"]}`);
    }
  }

  console.log("ANA-K treatment com 1 registro = insuficiente hasEnoughData=false");
  {
    const rows = [
      makeMinimalRow({
        entry_date: "2026-09-14",
        treatments: ["Hidratação"],
        perceived_result: "Bom",
      }),
    ];
    const r = computeTreatmentPatterns(rows);
    const hid = r.patterns.find((p) => p.treatment === "Hidratação");
    if (!hid) throw new Error("Hidratação não encontrado");
    if (hid.occurrences !== 1) throw new Error(`occ: ${hid.occurrences}`);
    if (hid.evaluatedPerceivedCount !== 1) {
      throw new Error(`eval: ${hid.evaluatedPerceivedCount}`);
    }
    if (hid.hasEnoughData !== false) throw new Error(`hasEnoughData não false: ${hid.hasEnoughData}`);
    if (hid.perceivedSufficiency !== false) {
      throw new Error(`perceivedSufficiency não false: ${hid.perceivedSufficiency}`);
    }
  }

  console.log("ANA-L treatment com 2 registros = insuficiente");
  {
    const rows = [
      makeMinimalRow({ entry_date: "2026-09-14", treatments: ["Nutrição"], perceived_result: "Bom" }),
      makeMinimalRow({ entry_date: "2026-09-15", treatments: ["Nutrição"], perceived_result: "Neutro" }),
    ];
    const r = computeTreatmentPatterns(rows);
    const n = r.patterns.find((p) => p.treatment === "Nutrição")!;
    if (n.evaluatedPerceivedCount !== 2) {
      throw new Error(`perceived eval 2: ${n.evaluatedPerceivedCount}`);
    }
    if (n.hasEnoughData !== false) throw new Error(`hasEnoughData não false: ${n.hasEnoughData}`);
  }

  console.log("ANA-M treatment com 3 registros avaliados = suficiente");
  {
    const rows = [
      makeMinimalRow({ entry_date: "2026-09-14", treatments: ["Reconstrução"], perceived_result: "Muito bom" }),
      makeMinimalRow({ entry_date: "2026-09-15", treatments: ["Reconstrução"], perceived_result: "Neutro" }),
      makeMinimalRow({ entry_date: "2026-09-16", treatments: ["Reconstrução"], perceived_result: "Ruim" }),
    ];
    const r = computeTreatmentPatterns(rows);
    const rec = r.patterns.find((p) => p.treatment === "Reconstrução")!;
    if (rec.evaluatedPerceivedCount !== 3) throw new Error(`eval: ${rec.evaluatedPerceivedCount}`);
    if (rec.perceivedSufficiency !== true) throw new Error(`perceivedSufficiency não true`);
    if (rec.hasEnoughData !== true) throw new Error(`hasEnoughData não true: ${rec.hasEnoughData}`);
    if (rec.positiveCount !== 1 || rec.neutralCount !== 1 || rec.negativeCount !== 1) {
      throw new Error(`pnz counts pos=${rec.positiveCount} neu=${rec.neutralCount} neg=${rec.negativeCount}`);
    }
  }

  console.log("ANA-N registro sem perceived mas com métrica tem métrica amostrada; perceived insuficiente ainda");
  {
    const rows = [
      makeMinimalRow({
        entry_date: "2026-09-14",
        treatments: ["Umectação"],
        perceived_result: null,
        definition: 4,
      }),
      makeMinimalRow({
        entry_date: "2026-09-15",
        treatments: ["Umectação"],
        perceived_result: null,
        definition: 5,
      }),
      makeMinimalRow({
        entry_date: "2026-09-16",
        treatments: ["Umectação"],
        perceived_result: null,
        definition: 3,
      }),
    ];
    const r = computeTreatmentPatterns(rows);
    const u = r.patterns.find((p) => p.treatment === "Umectação")!;
    if (u.evaluatedPerceivedCount !== 0) {
      throw new Error(`evaluatedPerceivedCount não 0: ${u.evaluatedPerceivedCount}`);
    }
    if (u.perceivedSufficiency !== false) throw new Error("perceivedSufficiency deveria false");
    if (u.metricsSufficiency.definition !== true) {
      throw new Error(`definition sufficiency não true: ${u.metricsSufficiency.definition}`);
    }
    if (u.metrics.definition.sampleCount !== 3) {
      throw new Error(`definition sample: ${u.metrics.definition.sampleCount}`);
    }
    assertFiniteNumber("definition média Umectação", u.metrics.definition.average, (4 + 5 + 3) / 3);
    if (u.hasEnoughData !== true) {
      throw new Error(`hasEnoughData não true (métrica suficiente): ${u.hasEnoughData}`);
    }
  }

  console.log("ANA-O comparação percebida entre duas janelas → médias e diferença");
  {
    const older = [
      makeMinimalRow({ entry_date: "2026-08-01", perceived_result: "Neutro" }),
      makeMinimalRow({ entry_date: "2026-08-05", perceived_result: "Bom" }),
    ];
    const recent = [
      makeMinimalRow({ entry_date: "2026-09-10", perceived_result: "Muito bom" }),
      makeMinimalRow({ entry_date: "2026-09-12", perceived_result: "Muito bom" }),
    ];
    const cmp = computePerceivedComparison(older, recent);
    assertFiniteNumber("overall older", cmp.overall.olderAverage, (3 + 4) / 2);
    assertFiniteNumber("overall recent", cmp.overall.recentAverage, (5 + 5) / 2);
    assertFiniteNumber("overall diff", cmp.overall.difference, 5 - 3.5);
    if (cmp.overall.olderSampleCount !== 2) {
      throw new Error(`olderSample: ${cmp.overall.olderSampleCount}`);
    }
    if (cmp.overall.recentSampleCount !== 2) {
      throw new Error(`recentSample: ${cmp.overall.recentSampleCount}`);
    }
  }

  console.log("ANA-P janela anterior vazia → averages older null, difference null");
  {
    const older: DiaryEntryRow[] = [];
    const recent = [
      makeMinimalRow({ entry_date: "2026-09-14", perceived_result: "Bom", definition: 5 }),
    ];
    const cmp = computePerceivedComparison(older, recent);
    if (cmp.overall.olderAverage !== null) {
      throw new Error(`overall olderAverage não null: ${String(cmp.overall.olderAverage)}`);
    }
    if (cmp.overall.difference !== null) {
      throw new Error(`overall difference não null: ${String(cmp.overall.difference)}`);
    }
    if (cmp.overall.recentSampleCount !== 1) {
      throw new Error(`overall recentSample não 1: ${cmp.overall.recentSampleCount}`);
    }
    for (const m of ["frizz", "dryness", "oiliness", "definition", "shine", "breakage"] as const) {
      if (m === "definition") {
        assertFiniteNumber("definition recent", cmp.metrics.definition.recentAverage, 5);
        if (cmp.metrics.definition.recentSampleCount !== 1) {
          throw new Error("definition recentSample não 1");
        }
      }
      if (cmp.metrics[m].olderAverage !== null) {
        throw new Error(`${m} olderAverage não null: ${String(cmp.metrics[m].olderAverage)}`);
      }
      if (cmp.metrics[m].difference !== null) {
        throw new Error(`${m} difference não null: ${String(cmp.metrics[m].difference)}`);
      }
    }
  }

  console.log("ANA-Q janela recente vazia → averages recent null, difference null");
  {
    const older = [
      makeMinimalRow({ entry_date: "2026-08-10", perceived_result: "Ruim", breakage: 1 }),
    ];
    const recent: DiaryEntryRow[] = [];
    const cmp = computePerceivedComparison(older, recent);
    assertFiniteNumber("overall older", cmp.overall.olderAverage, 2);
    if (cmp.overall.recentAverage !== null) {
      throw new Error(`overall recent não null: ${String(cmp.overall.recentAverage)}`);
    }
    if (cmp.overall.difference !== null) {
      throw new Error(`overall diff não null: ${String(cmp.overall.difference)}`);
    }
    assertFiniteNumber("breakage older", cmp.metrics.breakage.olderAverage, 1);
    if (cmp.metrics.breakage.recentAverage !== null) throw new Error("breakage recent não null");
    if (cmp.metrics.breakage.difference !== null) throw new Error("breakage diff não null");
  }

  console.log("ANA-R nenhuma divisão por zero / NaN / Infinity em shapes em bruto");
  {
    const cmp = computePerceivedComparison([], []);
    const s = computeWeeklySummary([], new Date(2026, 8, 20, 12));
    const t = computeTreatmentPatterns([]);
    const shapes: unknown[] = [cmp, s, t, cmp.overall, ...Object.values(cmp.metrics), ...Object.values(s.metrics)];
    for (const obj of shapes) {
      if (typeof obj !== "object" || obj === null) continue;
      for (const v of Object.values(obj as Record<string, unknown>)) {
        if (typeof v === "number" && (Number.isNaN(v) || !Number.isFinite(v))) {
          throw new Error(`NaN/Infinity em: ${JSON.stringify(obj)}`);
        }
        if (typeof v === "object" && v !== null) {
          for (const vv of Object.values(v as Record<string, unknown>)) {
            if (typeof vv === "number" && (Number.isNaN(vv) || !Number.isFinite(vv))) {
              throw new Error(`NaN/Infinity nested: ${JSON.stringify(v)}`);
            }
          }
        }
      }
    }
    if (t.patterns.length !== 0) throw new Error(`patterns vazio: ${t.patterns.length}`);
  }

  console.log("ANA-S nenhum dado ausente transformado em zero (média ou count perceived)");
  {
    const rows = [
      makeMinimalRow({
        entry_date: "2026-09-14",
        perceived_result: null,
        frizz: null,
        shine: null,
        treatments: ["Hidratação"],
      }),
      makeMinimalRow({
        entry_date: "2026-09-15",
        perceived_result: "Bom",
        frizz: 3,
        shine: null,
        treatments: ["Hidratação"],
      }),
    ];
    const hid = computeTreatmentPatterns(rows).patterns.find((p) => p.treatment === "Hidratação")!;
    if (hid.positiveCount !== 1) throw new Error(`positive não 1: ${hid.positiveCount}`);
    if (hid.evaluatedPerceivedCount !== 1) {
      throw new Error(`evaluatedPerceivedCount não 1: ${hid.evaluatedPerceivedCount}`);
    }
    if (hid.metrics.shine.sampleCount !== 0) {
      throw new Error(`shine sample não 0: ${hid.metrics.shine.sampleCount}`);
    }
    if (hid.metrics.shine.average !== null) {
      throw new Error(`shine average não null: ${String(hid.metrics.shine.average)}`);
    }
    const s = computeWeeklySummary(rows, new Date(2026, 8, 15, 12));
    if (s.perceived.evaluatedCount !== 1) {
      throw new Error(`weekly evaluatedCount não 1: ${s.perceived.evaluatedCount}`);
    }
    if (s.metrics.shine.average !== null) {
      throw new Error(`weekly shine average não null: ${String(s.metrics.shine.average)}`);
    }
    if (s.metrics.shine.sampleCount !== 0) {
      throw new Error(`weekly shine sample não 0: ${s.metrics.shine.sampleCount}`);
    }
  }

  console.log("ANA-T nenhuma função altera arrays/rows de entrada (imutabilidade)");
  {
    const row1 = makeMinimalRow({
      entry_date: "2026-09-14",
      treatments: ["Lavagem", "Hidratação"],
      perceived_result: "Bom",
      shine: 4,
    });
    const row2 = makeMinimalRow({
      entry_date: "2026-09-15",
      treatments: ["Nutrição"],
      perceived_result: null,
    });
    const r1TreatmentsOriginal = row1.treatments.slice();
    const r2EntryOriginal = row2.entry_date;
    const inputRows = [row1, row2];
    const inputRowsOriginalLength = inputRows.length;
    const originalReferences = [row1, row2];

    computeWeeklySummary(inputRows, new Date(2026, 8, 15, 12));
    computePerceivedComparison(inputRows.slice(0, 1), inputRows.slice(1));
    computeTreatmentPatterns(inputRows);

    if (inputRows.length !== inputRowsOriginalLength) {
      throw new Error("input length alterado");
    }
    if (inputRows[0] !== originalReferences[0] || inputRows[1] !== originalReferences[1]) {
      throw new Error("referências rows alteradas");
    }
    if (row1.treatments.join(",") !== r1TreatmentsOriginal.join(",")) {
      throw new Error(`row1 treatments alterado: ${row1.treatments.join(",")}`);
    }
    if (row2.entry_date !== r2EntryOriginal) {
      throw new Error(`row2 entry_date alterado: ${row2.entry_date}`);
    }
  }
}

function runStaticTests() {
  console.log("STATIC-1 normalizeISODate data civil literal YYYY-MM-DD");
  const d1a = normalizeISODate("2026-08-09");
  if (d1a !== "2026-08-09") throw new Error(`normalize err literal: ${d1a}`);

  console.log(
    "STATIC-1B normalizeISODate Date LOCAL 23:59:59.999 (virada fuso local não desloca dia)",
  );
  const d1bDate = new Date(2026, 7, 9, 23, 59, 59, 999);
  const d1b = normalizeISODate(d1bDate);
  if (d1b !== "2026-08-09") throw new Error(`normalize err local 23:59: ${d1b}`);

  console.log("STATIC-1C normalizeISODate REJEITA datetime strings com T/Z (contrato 2B)");
  let threwDatetimeString = false;
  try {
    normalizeISODate("2026-08-09T23:59:59.999Z");
  } catch {
    threwDatetimeString = true;
  }
  if (!threwDatetimeString) throw new Error("datetime ISO com T/Z deveria ter sido rejeitado");

  console.log("STATIC-2 validateTreatments aceita domínio");
  validateTreatments(["Lavagem", "Hidratação", "Outro"] as DiaryTreatment[]);

  console.log("STATIC-3 validateTreatments bloqueia valor inválido");
  let threw = false;
  try {
    validateTreatments(["Banho de barro"] as unknown as DiaryTreatment[]);
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("treatment inválido não bloqueado");

  console.log("STATIC-4 validatePayloadShape bloqueia frizz=0");
  threw = false;
  try {
    validatePayloadShape({ frizz: 0 });
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("escala não validada");

  console.log("STATIC-5 validatePayloadShape bloqueia perceived_result inválido");
  threw = false;
  try {
    validatePayloadShape({ perceived_result: "Fantástico" });
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("resultado inválido não validado");

  console.log(
    "STATIC-6 buildScheduleFocusSnapshot prefs null usa DEFAULT do cronograma (domingo = Cuidado)",
  );
  const sunday = new Date("2026-08-09T12:00:00Z");
  const n = buildScheduleFocusSnapshot(null, sunday);
  if (!n) throw new Error(`esperava snapshot fallback, recebi null`);
  if (n.weekday !== "sunday" || n.focus !== "Cuidado") {
    throw new Error(`snapshot default domingo errado: ${JSON.stringify(n)}`);
  }
  if (n.hair_type !== undefined && n.hair_type !== null) {
    throw new Error(`hair_type não deve existir no fallback default: ${JSON.stringify(n)}`);
  }
  if (n.goal !== undefined && n.goal !== null) {
    throw new Error(`goal não deve existir no fallback default: ${JSON.stringify(n)}`);
  }

  console.log("STATIC-7 buildScheduleFocusSnapshot domingo Nutrição cacheado");
  const sundayPrefs: {
    sunday: string;
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    hair_type: string | null;
    goal: string | null;
  } = {
    monday: "Hidratação",
    tuesday: "Nutrição",
    wednesday: "Cuidado",
    thursday: "Reconstrução",
    friday: "Umectação",
    saturday: "Finalização",
    sunday: "Nutrição",
    hair_type: "Cacheado",
    goal: "Crescimento sem quebra",
  };
  const snap = buildScheduleFocusSnapshot(sundayPrefs, sunday);
  if (!snap) throw new Error("snap inexistente");
  if (snap.focus !== "Nutrição" || snap.weekday !== "sunday") {
    throw new Error(`snap focus/weekday errado: ${JSON.stringify(snap)}`);
  }
  if (snap.hair_type !== "Cacheado" || !snap.goal?.includes("Crescimento")) {
    throw new Error(`snap extras errado: ${JSON.stringify(snap)}`);
  }

  console.log("STATIC-8 buildScheduleFocusSnapshot Monday = Reconstrução");
  const monday = new Date("2026-08-10T12:00:00Z");
  const mondayPrefs = {
    monday: "Reconstrução",
    tuesday: "Descanso",
    wednesday: "Nutrição",
    thursday: "Descanso",
    friday: "Hidratação",
    saturday: "Cuidado",
    sunday: "Umectação",
    hair_type: null as string | null,
    goal: null as string | null,
  };
  const snapMonday = buildScheduleFocusSnapshot(mondayPrefs, monday);
  if (!snapMonday) throw new Error("monday snap null");
  if (snapMonday.weekday !== "monday" || snapMonday.focus !== "Reconstrução") {
    throw new Error(`snap monday errado: ${JSON.stringify(snapMonday)}`);
  }
  if (snapMonday.hair_type !== undefined && snapMonday.hair_type !== null) {
    throw new Error("hair_type deve estar ausente/null");
  }

  console.log(
    "STATIC-9 buildScheduleFocusSnapshot fallback default por todos os dias úteis básicos",
  );
  const mapDayToExpected = [
    { date: new Date("2026-08-09T12:00:00Z"), w: "sunday", f: "Cuidado" },
    { date: new Date("2026-08-10T12:00:00Z"), w: "monday", f: "Hidratação" },
    { date: new Date("2026-08-12T12:00:00Z"), w: "wednesday", f: "Nutrição" },
    { date: new Date("2026-08-15T12:00:00Z"), w: "saturday", f: "Reconstrução" },
    { date: new Date("2026-08-11T12:00:00Z"), w: "tuesday", f: "Descanso" },
    { date: new Date("2026-08-13T12:00:00Z"), w: "thursday", f: "Descanso" },
    { date: new Date("2026-08-14T12:00:00Z"), w: "friday", f: "Hidratação" },
  ] as const;
  for (const c of mapDayToExpected) {
    const s = buildScheduleFocusSnapshot(null, c.date);
    if (!s) throw new Error(`snap fallback null para ${c.w}`);
    if (s.weekday !== c.w || s.focus !== c.f) {
      throw new Error(`snap fallback ${c.w} esperava ${c.f} recebi ${JSON.stringify(s)}`);
    }
  }

  console.log("STATIC-10 buildScheduleFocusSnapshot schedule_source='app'");
  const prefsAppBase = {
    monday: "Hidratação",
    tuesday: "Nutrição",
    wednesday: "Cuidado",
    thursday: "Reconstrução",
    friday: "Umectação",
    saturday: "Finalização",
    sunday: "Nutrição",
    hair_type: "Cacheado",
    goal: "Crescimento sem quebra",
  } as const;
  const prefsApp: SchedulePrefsWithSource = {
    ...prefsAppBase,
    schedule_source: "app",
  };
  const snapApp = buildScheduleFocusSnapshot(prefsApp, new Date(2026, 7, 9, 12, 0, 0, 0));
  if (!snapApp) throw new Error("snap app null");
  if (snapApp.schedule_source !== "app") {
    throw new Error(
      `snap app esperava source 'app' recebi ${JSON.stringify(snapApp.schedule_source)}`,
    );
  }
  if (snapApp.hair_type !== "Cacheado" || !snapApp.goal?.includes("Crescimento")) {
    throw new Error(`snap app campos não batem: ${JSON.stringify(snapApp)}`);
  }

  console.log("STATIC-11 buildScheduleFocusSnapshot schedule_source='own'");
  const prefsOwn: SchedulePrefsWithSource = {
    ...prefsAppBase,
    schedule_source: "own",
  };
  const snapOwn = buildScheduleFocusSnapshot(prefsOwn, new Date(2026, 7, 10, 12, 0, 0, 0));
  if (!snapOwn) throw new Error("snap own null");
  if (snapOwn.schedule_source !== "own") {
    throw new Error(
      `snap own esperava source 'own' recebi ${JSON.stringify(snapOwn.schedule_source)}`,
    );
  }
  if (snapOwn.schedule_source !== null && snapOwn.schedule_source === prefsOwn.schedule_source) {
    // ok
  } else {
    throw new Error("snap own source não bate");
  }

  console.log("STATIC-12 buildScheduleFocusSnapshot sem prefs (null) → schedule_source=null");
  const snapFree = buildScheduleFocusSnapshot(null, new Date(2026, 7, 11, 12, 0, 0, 0));
  if (!snapFree) throw new Error("snap free null");
  if (snapFree.schedule_source !== null) {
    throw new Error(
      `snap free esperava source null recebi ${JSON.stringify(snapFree.schedule_source)}`,
    );
  }

  console.log(
    "STATIC-13 parseSavedScheduleSnapshot legado SEM schedule_source → válido / source null",
  );
  const legacyValid = {
    weekday: "sunday",
    focus: "Cuidado",
    hair_type: "Cacheado",
    goal: "Crescimento",
  };
  const parsedLegacy = parseSavedScheduleSnapshot(legacyValid);
  if (!parsedLegacy) throw new Error("legacy válido foi parseado como null");
  if (parsedLegacy.schedule_source !== null) {
    throw new Error(
      `legacy válido esperava source null, recebi ${JSON.stringify(parsedLegacy.schedule_source)}`,
    );
  }
  if (parsedLegacy.weekday !== "sunday" || parsedLegacy.focus !== "Cuidado") {
    throw new Error(`legacy válido campos quebrados: ${JSON.stringify(parsedLegacy)}`);
  }

  console.log("STATIC-14 parseSavedScheduleSnapshot com schedule_source='app'");
  const withAppSource = { ...legacyValid, schedule_source: "app" };
  const parsedApp = parseSavedScheduleSnapshot(withAppSource);
  if (!parsedApp) throw new Error("com app source parseou null");
  if (parsedApp.schedule_source !== "app") {
    throw new Error(`esperava app recebi ${JSON.stringify(parsedApp.schedule_source)}`);
  }

  console.log("STATIC-15 parseSavedScheduleSnapshot com schedule_source='own'");
  const withOwnSource = { ...legacyValid, schedule_source: "own" };
  const parsedOwn = parseSavedScheduleSnapshot(withOwnSource);
  if (!parsedOwn) throw new Error("com own source parseou null");
  if (parsedOwn.schedule_source !== "own") {
    throw new Error(`esperava own recebi ${JSON.stringify(parsedOwn.schedule_source)}`);
  }

  console.log("STATIC-16 parseSavedScheduleSnapshot estruturalmente inválido → null");
  const invalids: unknown[] = [null, undefined, "string", 42, [], new Date()];
  for (const v of invalids) {
    if (parseSavedScheduleSnapshot(v) !== null) {
      throw new Error(`parseSavedScheduleSnapshot inválido ${String(v)} devia ser null`);
    }
  }

  console.log("STATIC-17 parseSavedScheduleSnapshot weekday inválido → null");
  const badWeekday = { weekday: "sabado", focus: "Cuidado" };
  if (parseSavedScheduleSnapshot(badWeekday) !== null) {
    throw new Error("weekday sabado inválido devia ser null");
  }

  console.log("STATIC-18 parseSavedScheduleSnapshot focus inválido → null");
  const badFocus = { weekday: "monday", focus: "Alisamento" };
  if (parseSavedScheduleSnapshot(badFocus) !== null) {
    throw new Error("focus Alisamento inválido devia ser null");
  }
}

async function provisionFeatureAccessForUser(
  svc: SupabaseClient<Database>,
  userId: string,
  featureKey: string,
) {
  const planQ = await svc.from("subscription_plans").select("id").limit(1);
  const planId = (planQ.data?.[0] as { id: string } | undefined)?.id;
  if (!planId) return;
  try {
    await svc
      .from("subscription_features")
      .insert({ feature_key: featureKey, feature_name: featureKey })
      .throwOnError();
  } catch {
    /* unique violation = já existe */
  }
  try {
    await svc
      .from("plan_feature_access")
      .insert({ plan_id: planId, feature_key: featureKey })
      .throwOnError();
  } catch {
    /* unique violation = já existe */
  }
  try {
    await svc
      .from("user_subscription_state")
      .upsert(
        {
          user_id: userId,
          plan_id: planId,
          status: "active",
          current_period_end: new Date(Date.now() + 86400_000 * 30).toISOString(),
        },
        { onConflict: "user_id" },
      )
      .throwOnError();
  } catch {
    /* ignore */
  }
}

async function runIntegrationTests(userId: string) {
  const svc = createSvc();
  await provisionFeatureAccessForUser(svc, userId, "cronograma-personalizado");
  await provisionFeatureAccessForUser(svc, userId, "diario-capilar");

  console.log("INT-1 getDiaryEntryByDate vazio → null (sem userId na API pública)");
  const empty = await getDiaryEntryByDate("2026-08-09");
  if (empty !== null) throw new Error("não era null");

  console.log("INT-2 criar 2026-08-09");
  const created = await upsertDiaryEntry("2026-08-09", {
    treatments: ["Lavagem", "Hidratação"],
    frizz: 2,
    dryness: 3,
    oiliness: 2,
    definition: 4,
    shine: 4,
    breakage: 1,
    perceived_result: "Bom",
    note: "Cabelo macio",
  });
  if (!created.id) throw new Error("sem id");
  if (created.entry_date !== "2026-08-09") throw new Error("entry_date errado");
  if (created.treatments.join(",") !== "Lavagem,Hidratação") throw new Error("treatments errado");
  if (created.user_id !== userId) throw new Error("user_id errado (não bate com sessão)");

  console.log("INT-3 editar mesma data não duplica, preserva treatments");
  const edited = await upsertDiaryEntry("2026-08-09", { definition: 5, note: "atualizado" });
  if (edited.id !== created.id) throw new Error("id mudou → duplicou");
  if (edited.definition !== 5) throw new Error("definition não atualizou");
  if (edited.treatments.join(",") !== "Lavagem,Hidratação") throw new Error("treatments caiu");

  console.log("INT-4 criar 2026-08-10 (segunda data)");
  const day2 = await upsertDiaryEntry("2026-08-10", { treatments: ["Umectação"], shine: 5 });
  if (day2.entry_date !== "2026-08-10") throw new Error("dia errado");

  console.log("INT-5 contagem real: 2026-08-09 tem 1 registro");
  const cntRes = await svc
    .from("diary_entries")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .eq("entry_date", "2026-08-09");
  if (cntRes.error) throw cntRes.error;
  const count = cntRes.data?.length ?? 0;
  if (count !== 1) throw new Error(`contagem errada: ${count} (${JSON.stringify(cntRes.data)})`);

  console.log("INT-6 listDiaryEntries desc 10/09 (sem userId)");
  const list = await listDiaryEntries(2);
  if (list.length !== 2) throw new Error(`list len ${list.length}`);
  if (list[0].entry_date !== "2026-08-10" || list[1].entry_date !== "2026-08-09") {
    throw new Error("ordem errada");
  }

  console.log("INT-7 paginação (1,1) retorna só 08-09");
  const paged = await listDiaryEntries(1, 1);
  if (paged.length !== 1 || paged[0].entry_date !== "2026-08-09") {
    throw new Error(`paginação quebrada: ${JSON.stringify(paged)}`);
  }

  console.log("INT-8 buscar por 2026-08-10 bate com day2.id");
  const byDate = await getDiaryEntryByDate("2026-08-10");
  if (!byDate || byDate.id !== day2.id) throw new Error("busca por data quebrada");

  console.log(
    "INT-9 snapshot FALLBACK DEFAULT quando não há schedule_preferences (FREE / sem linha)",
  );
  {
    const s = created.scheduled_focus_snapshot as unknown as {
      focus: string;
      weekday: string;
      hair_type?: string | null;
      goal?: string | null;
    } | null;
    if (!s) {
      throw new Error(
        `snapshot estava null, devia ter DEFAULT fallback: ${JSON.stringify(created.scheduled_focus_snapshot)}`,
      );
    }
    if (s.focus !== "Cuidado" || s.weekday !== "sunday") {
      throw new Error(`snapshot default domingo devia ser Cuidado: ${JSON.stringify(s)}`);
    }
    // default não tem hair_type/goal:
    if (s.hair_type) throw new Error(`hair_type indevido no default: ${JSON.stringify(s)}`);
    if (s.goal) throw new Error(`goal indevido no default: ${JSON.stringify(s)}`);
  }
  const snapshotCriacaoOriginal = created.scheduled_focus_snapshot;

  console.log(
    "INT-10 insere schedule_preferences (service role). UPDATE não altera snapshot histórico. INSERT NOVA entrada reflete cronograma atual.",
  );
  {
    const up = await svc.from("schedule_preferences").upsert(
      {
        user_id: userId,
        hair_type: "Cacheado",
        goal: "Crescimento sem quebra",
        monday: "Hidratação",
        tuesday: "Nutrição",
        wednesday: "Cuidado",
        thursday: "Reconstrução",
        friday: "Umectação",
        saturday: "Finalização",
        sunday: "Nutrição",
      },
      { onConflict: "user_id" },
    );
    if (up.error) throw up.error;
  }

  // A) UPDATE note de entry existente: snapshot deve PERMANECER IGUAL ao original
  const refreshed = await upsertDiaryEntry("2026-08-09", {
    note: "atualizado depois de schedule salvo",
  });
  if (refreshed.id !== created.id) throw new Error("id mudou no update");
  if (refreshed.scheduled_focus_snapshot !== snapshotCriacaoOriginal) {
    // comparação profunda se for objeto
    const before = JSON.stringify(snapshotCriacaoOriginal);
    const after = JSON.stringify(refreshed.scheduled_focus_snapshot);
    if (before !== after) {
      throw new Error(`UPDATE sobrescreveu snapshot histórico! Antes: ${before}  Depois: ${after}`);
    }
  }
  {
    const r = refreshed.scheduled_focus_snapshot as unknown as {
      focus: string;
      weekday: string;
      hair_type?: string;
      goal?: string;
    };
    // Snapshot histórico continua Cuidado (fallback quando foi criado, apesar de domingo agora ser Nutrição).
    if (r.focus !== "Cuidado" || r.weekday !== "sunday") {
      throw new Error(`snapshot histórico foi alterado após UPDATE: ${JSON.stringify(r)}`);
    }
  }
  // Campos parciais preservados
  if (refreshed.definition !== 5) throw new Error("definition caiu após update note");
  if (refreshed.treatments.join(",") !== "Lavagem,Hidratação")
    throw new Error("treatments caiu após update note");
  if (!refreshed.note?.includes("atualizado depois de schedule salvo"))
    throw new Error("note não atualizou");

  // B) INSERT de nova entrada (domingo 16) → novo snapshot reflete o cronograma ATUAL (domingo = Nutrição, Cacheado, Crescimento)
  console.log("INT-11 INSERT novo domingo (16/08) usa cronograma atualizado");
  const day16 = await upsertDiaryEntry("2026-08-16", {
    treatments: ["Nutrição", "Umectação"],
    perceived_result: "Muito bom",
    shine: 5,
  });
  if (day16.entry_date !== "2026-08-16") throw new Error("entry_date errado dia16");
  {
    const snap = day16.scheduled_focus_snapshot as unknown as {
      focus: string;
      weekday: string;
      hair_type?: string;
      goal?: string;
    };
    if (!snap) throw new Error(`novo snapshot não foi gravado`);
    if (snap.weekday !== "sunday" || snap.focus !== "Nutrição") {
      throw new Error(`snapshot dia 16 devia ser domingo Nutrição: ${JSON.stringify(snap)}`);
    }
    if (snap.hair_type !== "Cacheado" || !snap.goal?.includes("Crescimento")) {
      throw new Error(`snapshot dia 16 não incluiu hair_type/goal: ${JSON.stringify(snap)}`);
    }
  }

  console.log("INT-12 UPDATE treatments (sem mudar dia) não altera snapshot histórico");
  {
    const before = JSON.stringify(day16.scheduled_focus_snapshot);
    const edited = await upsertDiaryEntry("2026-08-16", {
      treatments: ["Nutrição", "Finalização"],
      definition: 4,
    });
    const after = JSON.stringify(edited.scheduled_focus_snapshot);
    if (before !== after)
      throw new Error(`UPDATE treatments alterou snapshot! Antes:${before}  Depois:${after}`);
    if (edited.treatments.join(",") !== "Nutrição,Finalização")
      throw new Error("treatments não atualizaram");
    if (edited.definition !== 4) throw new Error("definition não atualizou");
  }

  console.log("INT-13 ALTERAR CRONOGRAMA DEPOIS: domingo = Cuidado → snapshot histórico não muda");
  {
    const up2 = await svc.from("schedule_preferences").upsert(
      {
        user_id: userId,
        hair_type: "Ondulado",
        goal: "Reduzir frizz",
        monday: "Hidratação",
        tuesday: "Descanso",
        wednesday: "Nutrição",
        thursday: "Descanso",
        friday: "Hidratação",
        saturday: "Reconstrução",
        sunday: "Cuidado",
      },
      { onConflict: "user_id" },
    );
    if (up2.error) throw up2.error;

    // editar note do day16 (que tem domingo Nutrição histórico)
    const beforeSnap = JSON.stringify(day16.scheduled_focus_snapshot);
    const editedDay16 = await upsertDiaryEntry("2026-08-16", {
      note: "registro do dia 16 atualizado depois mudança cronograma",
    });
    const afterSnap = JSON.stringify(editedDay16.scheduled_focus_snapshot);
    if (beforeSnap !== afterSnap) {
      throw new Error(
        `ALTERAR cronograma alterou snapshot histórico dia 16! Antes:${beforeSnap} Depois:${afterSnap}`,
      );
    }
    const snap = editedDay16.scheduled_focus_snapshot as unknown as {
      focus: string;
      weekday: string;
      hair_type?: string;
      goal?: string;
    };
    // snapshot histórico continua Nutrição/Cacheado/Crescimento
    if (
      snap.focus !== "Nutrição" ||
      snap.hair_type !== "Cacheado" ||
      !snap.goal?.includes("Crescimento")
    ) {
      throw new Error(`snap histórico não preservado: ${JSON.stringify(snap)}`);
    }
    if (!editedDay16.note?.includes("atualizado depois mudança cronograma"))
      throw new Error("note não atualizou");
  }

  console.log("INT-14 INSERT NOVA entrada após mudança cronograma reflete novo plano");
  // domingo 23/08
  const day23 = await upsertDiaryEntry("2026-08-23", {
    treatments: ["Lavagem", "Cuidado"],
    perceived_result: "Bom",
    breakage: 2,
  });
  {
    const snap = day23.scheduled_focus_snapshot as unknown as {
      focus: string;
      weekday: string;
      hair_type?: string;
      goal?: string;
    };
    if (!snap) throw new Error("snap dia23 não gravado");
    // Novo cronograma: domingo = Cuidado; hair Ondulado, goal Reduzir frizz
    if (snap.weekday !== "sunday" || snap.focus !== "Cuidado") {
      throw new Error(`snap dia23 esperava domingo=Cuidado: ${JSON.stringify(snap)}`);
    }
    if (snap.hair_type !== "Ondulado" || !snap.goal?.includes("Reduzir frizz")) {
      throw new Error(`snap dia23 não incluiu hair_type/goal NOVOS: ${JSON.stringify(snap)}`);
    }
  }

  console.log("INT-15 snapshot NULL histórico não é preenchido retroativamente em UPDATE");
  {
    const svcEntry = await svc
      .from("diary_entries")
      .insert({
        user_id: userId,
        entry_date: "2026-08-17",
        treatments: ["Finalização"],
        note: "registro sem snapshot (via service)",
      })
      .select("*")
      .single();
    if (svcEntry.error) throw svcEntry.error;
    if (svcEntry.data.scheduled_focus_snapshot !== null) {
      // forçar via service para null para garantir teste
      const forced = await svc
        .from("diary_entries")
        .update({ scheduled_focus_snapshot: null as unknown as never })
        .eq("id", svcEntry.data.id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (forced.error) throw forced.error;
    }

    const edited = await upsertDiaryEntry("2026-08-17", {
      note: "editado por usuário sem snapshot antigo",
      shine: 3,
    });
    if (edited.scheduled_focus_snapshot !== null) {
      throw new Error(
        `UPDATE Preencheu snapshot NULL retroativamente: ${JSON.stringify(edited.scheduled_focus_snapshot)}`,
      );
    }
    if (!edited.note?.includes("editado por usuário sem snapshot antigo"))
      throw new Error("note não atualizou H");
    if (edited.shine !== 3) throw new Error("shine não atualizou H");
  }

  console.log("INT-16 service bloqueia treatment fora do domínio (não chega ao banco)");
  let threw = false;
  try {
    await upsertDiaryEntry("2026-08-11", {
      treatments: ["Botox"] as unknown as DiaryTreatment[],
    });
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("não bloqueou treatment inválido");
}

async function main() {
  runStaticTests();
  runAnalysisStaticTests();
  if (!RUN_INTEGRATION) {
    console.log(
      "DIARY_SERVICE_STATIC_OK (integração pulada — informe SUPABASE_SERVICE_ROLE_KEY e VITE_SUPABASE_* para rodar tudo)",
    );
    return;
  }
  const svc = createSvc();
  const user = await provision(svc);
  try {
    await loginUser(user.email);
    const { data: who } = await supabase.auth.getUser();
    if (who.user?.id !== user.id) {
      throw new Error("sessão autenticada com user errado");
    }
    await runIntegrationTests(user.id);
  } finally {
    await cleanup(svc, user.id);
  }
  const svc2 = createSvc();
  const { count: left } = await svc2
    .from("diary_entries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (left !== 0) throw new Error(`limpeza falhou, sobraram ${left}`);
  console.log("DIARY_SERVICE_TESTS_OK");
}

main().catch((e) => {
  console.error("DIARY_SERVICE_TESTS_FAILED", e);
  process.exit(1);
});

export {};
