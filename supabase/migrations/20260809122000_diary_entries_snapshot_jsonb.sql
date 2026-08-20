-- Fase 2A ajuste complementar: scheduled_focus_snapshot TEXT → JSONB
-- Idempotente e seguro. Dados válidos atualmente (0 linhas não-null; todos passam USING::jsonb).

ALTER TABLE IF EXISTS public.diary_entries
  ALTER COLUMN scheduled_focus_snapshot TYPE JSONB
  USING scheduled_focus_snapshot::jsonb;

ALTER TABLE IF EXISTS public.diary_entries
  ALTER COLUMN scheduled_focus_snapshot SET DEFAULT NULL;
