import { supabase } from "@/integrations/supabase/client";
import { DIARY_PERCEIVED_RESULTS, DIARY_PERCEPTION_METRICS, DIARY_TREATMENTS } from "@/types/diary";
import type {
  DiaryEntryInsert,
  DiaryEntryRow,
  DiaryEntryUpdate,
  DiaryPerceivedResult,
  DiaryPerceptionMetric,
  DiaryPerceptionScale,
  DiaryTreatment,
  ScheduleFocusSnapshot,
} from "@/types/diary";
import type { Tables } from "@/integrations/supabase/types";

type SchedulePreferencesRow = Tables<"schedule_preferences">;

const ALLOWED_TREATMENTS = new Set<string>(DIARY_TREATMENTS);
const ALLOWED_RESULTS = new Set<string>(DIARY_PERCEIVED_RESULTS);

export type DiaryEntryPayloadShape = {
  treatments?: DiaryTreatment[];
  perceived_result?: DiaryPerceivedResult | null;
  frizz?: DiaryPerceptionScale | null;
  dryness?: DiaryPerceptionScale | null;
  oiliness?: DiaryPerceptionScale | null;
  definition?: DiaryPerceptionScale | null;
  shine?: DiaryPerceptionScale | null;
  breakage?: DiaryPerceptionScale | null;
  note?: string | null;
  evolution_photo_id?: string | null;
};

async function resolveAuthenticatedUserIdOrThrow(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user?.id) {
    throw new Error("Usuário não autenticado para operação no diário");
  }
  return data.user.id;
}

export function normalizeISODate(dateInput: string | Date): string {
  const YYYY_MM_DD = /^(\d{4})-(\d{2})-(\d{2})$/;

  if (typeof dateInput === "string") {
    const match = dateInput.match(YYYY_MM_DD);
    if (!match) {
      throw new Error("Data informada para o diário é inválida");
    }
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (month < 1 || month > 12) {
      throw new Error("Data informada para o diário é inválida");
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      throw new Error("Data informada para o diário é inválida");
    }
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const date = dateInput;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error("Data informada para o diário é inválida");
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function validatePerceptionScale(
  metric: DiaryPerceptionMetric,
  value: unknown,
): asserts value is DiaryPerceptionScale | null | undefined {
  if (value === null || value === undefined) return;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error(
      `Métrica ${metric} do diário precisa ser um número inteiro entre 1 e 5, ou null/undefined`,
    );
  }
}

export function validateTreatments(
  treatments: unknown,
): asserts treatments is DiaryTreatment[] | undefined {
  if (treatments === undefined) return;
  if (!Array.isArray(treatments)) {
    throw new Error("Tratamentos do diário precisam ser uma lista");
  }
  for (const item of treatments) {
    if (typeof item !== "string" || !ALLOWED_TREATMENTS.has(item)) {
      throw new Error(
        `Tratamento "${String(item)}" não permitido. Valores aceitos: ${DIARY_TREATMENTS.join(", ")}`,
      );
    }
  }
}

function validatePerceivedResult(
  value: unknown,
): asserts value is DiaryPerceivedResult | null | undefined {
  if (value === null || value === undefined) return;
  if (typeof value !== "string" || !ALLOWED_RESULTS.has(value)) {
    throw new Error(
      `Resultado percebido "${String(value)}" não permitido. Valores aceitos: ${DIARY_PERCEIVED_RESULTS.join(", ")}`,
    );
  }
}

export function validatePayloadShape(payload: DiaryEntryPayloadShape): DiaryEntryPayloadShape {
  validateTreatments(payload.treatments);
  validatePerceivedResult(payload.perceived_result);
  for (const metric of DIARY_PERCEPTION_METRICS) {
    validatePerceptionScale(metric, payload[metric]);
  }
  if (payload.note !== undefined && payload.note !== null && typeof payload.note !== "string") {
    throw new Error("Observação (note) do diário precisa ser texto");
  }
  if (
    payload.evolution_photo_id !== undefined &&
    payload.evolution_photo_id !== null &&
    typeof payload.evolution_photo_id !== "string"
  ) {
    throw new Error("evolution_photo_id precisa ser UUID em formato texto ou null");
  }
  return payload;
}

export function buildScheduleFocusSnapshot(
  prefs: SchedulePreferencesRow | null,
  date: Date,
): ScheduleFocusSnapshot | null {
  if (!prefs) return null;
  const weekdayIndex = date.getDay();
  const weekdayKeys = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;
  const key = weekdayKeys[weekdayIndex];
  const focus = ((prefs as Record<string, unknown>)[key] as string | null | undefined) ?? null;
  if (!focus || typeof focus !== "string") return null;
  const hairType = prefs.hair_type ?? null;
  const goal = prefs.goal ?? null;
  const snapshot: ScheduleFocusSnapshot = { weekday: key, focus };
  if (hairType) snapshot.hair_type = hairType;
  if (goal) snapshot.goal = goal;
  return snapshot;
}

async function getSchedulePreferencesForUser(
  userId: string,
): Promise<SchedulePreferencesRow | null> {
  const { data, error } = await supabase
    .from("schedule_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as SchedulePreferencesRow | null) ?? null;
}

export async function getDiaryEntryByDate(date: string | Date): Promise<DiaryEntryRow | null> {
  const userId = await resolveAuthenticatedUserIdOrThrow();
  const entryDate = normalizeISODate(date);
  const { data, error } = await supabase
    .from("diary_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("entry_date", entryDate)
    .maybeSingle();
  if (error) throw error;
  return (data as DiaryEntryRow | null) ?? null;
}

export async function listDiaryEntries(limit: number, offset?: number): Promise<DiaryEntryRow[]> {
  const userId = await resolveAuthenticatedUserIdOrThrow();
  if (!Number.isFinite(limit) || !Number.isInteger(limit) || limit < 1) {
    throw new Error("limit precisa ser um inteiro positivo");
  }
  if (
    offset !== undefined &&
    (!Number.isFinite(offset) || !Number.isInteger(offset) || offset < 0)
  ) {
    throw new Error("offset precisa ser um inteiro não negativo");
  }
  let query = supabase
    .from("diary_entries")
    .select("*")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .limit(limit);
  if (offset !== undefined) {
    query = query.range(offset, offset + limit - 1);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DiaryEntryRow[];
}

export async function upsertDiaryEntry(
  date: string | Date,
  payload: DiaryEntryPayloadShape,
): Promise<DiaryEntryRow> {
  const userId = await resolveAuthenticatedUserIdOrThrow();
  const validated = validatePayloadShape(payload);
  const entryDate = normalizeISODate(date);
  let dateForSnapshot: Date;
  if (typeof date === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (match) {
      dateForSnapshot = new Date(
        parseInt(match[1], 10),
        parseInt(match[2], 10) - 1,
        parseInt(match[3], 10),
        12,
        0,
        0,
        0,
      );
    } else {
      dateForSnapshot = new Date(entryDate);
    }
  } else {
    dateForSnapshot = date;
  }

  const schedulePrefs = await getSchedulePreferencesForUser(userId);
  const scheduledFocusSnapshot = buildScheduleFocusSnapshot(schedulePrefs, dateForSnapshot);

  const existingEntry = await getDiaryEntryByDate(entryDate);

  if (existingEntry) {
    const updatePayload: DiaryEntryUpdate = {};
    if (validated.treatments !== undefined) updatePayload.treatments = validated.treatments;
    if (validated.perceived_result !== undefined)
      updatePayload.perceived_result = validated.perceived_result;
    if (validated.frizz !== undefined) updatePayload.frizz = validated.frizz;
    if (validated.dryness !== undefined) updatePayload.dryness = validated.dryness;
    if (validated.oiliness !== undefined) updatePayload.oiliness = validated.oiliness;
    if (validated.definition !== undefined) updatePayload.definition = validated.definition;
    if (validated.shine !== undefined) updatePayload.shine = validated.shine;
    if (validated.breakage !== undefined) updatePayload.breakage = validated.breakage;
    if (validated.note !== undefined) updatePayload.note = validated.note;
    if (validated.evolution_photo_id !== undefined)
      updatePayload.evolution_photo_id = validated.evolution_photo_id;
    if (scheduledFocusSnapshot !== null) {
      updatePayload.scheduled_focus_snapshot =
        scheduledFocusSnapshot as unknown as import("@/integrations/supabase/types").Json;
    }

    const { data, error } = await supabase
      .from("diary_entries")
      .update(updatePayload)
      .eq("id", existingEntry.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return data as DiaryEntryRow;
  }

  const insertPayload: DiaryEntryInsert = {
    user_id: userId,
    entry_date: entryDate,
    treatments: validated.treatments ?? [],
    perceived_result: validated.perceived_result ?? null,
    frizz: validated.frizz ?? null,
    dryness: validated.dryness ?? null,
    oiliness: validated.oiliness ?? null,
    definition: validated.definition ?? null,
    shine: validated.shine ?? null,
    breakage: validated.breakage ?? null,
    note: validated.note ?? null,
    evolution_photo_id: validated.evolution_photo_id ?? null,
    scheduled_focus_snapshot: scheduledFocusSnapshot as unknown as
      | import("@/integrations/supabase/types").Json
      | null,
  };

  const { data, error } = await supabase
    .from("diary_entries")
    .insert(insertPayload)
    .select("*")
    .single();
  if (error) {
    if (
      error.code === "23505" &&
      typeof error.message === "string" &&
      error.message.includes("diary_entries_user_entry_unique")
    ) {
      const retry = await getDiaryEntryByDate(entryDate);
      if (!retry) throw error;
      return upsertDiaryEntry(entryDate, payload);
    }
    throw error;
  }
  return data as DiaryEntryRow;
}
