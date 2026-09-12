export type ScheduleFocus = "Hidratação" | "Nutrição" | "Reconstrução" | "Descanso" | "Cuidado";

export type ScheduleSource = "app" | "own";

export function parseScheduleSource(value: unknown): ScheduleSource {
  return value === "app" || value === "own" ? value : "app";
}

export type ScheduleFocusWeek<TFocus = ScheduleFocus> = {
  readonly monday: TFocus;
  readonly tuesday: TFocus;
  readonly wednesday: TFocus;
  readonly thursday: TFocus;
  readonly friday: TFocus;
  readonly saturday: TFocus;
  readonly sunday: TFocus;
};

export type SchedulePrefsShape<
  TText extends string | null = string | null,
  TFocus = ScheduleFocus,
> = {
  readonly hair_type: TText;
  readonly goal: TText;
} & ScheduleFocusWeek<TFocus>;

export type SchedulePrefsWithSource<
  TText extends string | null = string | null,
  TFocus = ScheduleFocus,
> = SchedulePrefsShape<TText, TFocus> & {
  readonly schedule_source?: ScheduleSource | TText;
};

export type DefaultSchedulePrefs = SchedulePrefsShape<null, ScheduleFocus>;

export const DEFAULT_SCHEDULE_PREFS: DefaultSchedulePrefs = Object.freeze({
  hair_type: null,
  goal: null,
  monday: "Hidratação",
  tuesday: "Descanso",
  wednesday: "Nutrição",
  thursday: "Descanso",
  friday: "Hidratação",
  saturday: "Reconstrução",
  sunday: "Cuidado",
});
