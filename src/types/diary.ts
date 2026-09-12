import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { ScheduleFocus, ScheduleSource } from "@/constants/schedule-defaults";

export const DIARY_TREATMENTS = [
  "Lavagem",
  "Hidratação",
  "Nutrição",
  "Reconstrução",
  "Umectação",
  "Finalização",
  "Química",
  "Outro",
] as const;

export type DiaryTreatment = (typeof DIARY_TREATMENTS)[number];

export const DIARY_PERCEPTION_METRICS = [
  "frizz",
  "dryness",
  "oiliness",
  "definition",
  "shine",
  "breakage",
] as const;

export type DiaryPerceptionMetric = (typeof DIARY_PERCEPTION_METRICS)[number];

export const DIARY_PERCEIVED_RESULTS = [
  "Muito ruim",
  "Ruim",
  "Neutro",
  "Bom",
  "Muito bom",
] as const;

export type DiaryPerceivedResult = (typeof DIARY_PERCEIVED_RESULTS)[number];

export type DiaryPerceptionScale = 1 | 2 | 3 | 4 | 5;

export type ScheduleFocusSnapshot = {
  weekday: "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";
  focus: ScheduleFocus;
  hair_type: string | null;
  goal: string | null;
  schedule_source: ScheduleSource | null;
};

export type DiaryEntryRow = Tables<"diary_entries">;
export type DiaryEntryInsert = TablesInsert<"diary_entries">;
export type DiaryEntryUpdate = TablesUpdate<"diary_entries">;

export type DiaryEntryFormValues = {
  entry_date: string;
  treatments: DiaryTreatment[];
  perceived_result: DiaryPerceivedResult | null;
  frizz: DiaryPerceptionScale | null;
  dryness: DiaryPerceptionScale | null;
  oiliness: DiaryPerceptionScale | null;
  definition: DiaryPerceptionScale | null;
  shine: DiaryPerceptionScale | null;
  breakage: DiaryPerceptionScale | null;
  note: string | null;
  evolution_photo_id: string | null;
};
