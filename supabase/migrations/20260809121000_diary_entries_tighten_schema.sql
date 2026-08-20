ALTER TABLE IF EXISTS public.diary_entries
DROP COLUMN IF EXISTS extra;

ALTER TABLE IF EXISTS public.diary_entries
DROP CONSTRAINT IF EXISTS diary_entries_treatments_check_values;

ALTER TABLE IF EXISTS public.diary_entries
ADD CONSTRAINT diary_entries_treatments_check_values
CHECK (
  treatments <@ ARRAY[
    'Lavagem',
    'Hidratação',
    'Nutrição',
    'Reconstrução',
    'Umectação',
    'Finalização',
    'Química',
    'Outro'
  ]::text[]
);
