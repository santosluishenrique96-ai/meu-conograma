CREATE TABLE IF NOT EXISTS public.diary_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  treatments TEXT[] NOT NULL DEFAULT '{}',
  perceived_result TEXT NULL,
  frizz SMALLINT NULL CHECK (frizz BETWEEN 1 AND 5),
  dryness SMALLINT NULL CHECK (dryness BETWEEN 1 AND 5),
  oiliness SMALLINT NULL CHECK (oiliness BETWEEN 1 AND 5),
  definition SMALLINT NULL CHECK (definition BETWEEN 1 AND 5),
  shine SMALLINT NULL CHECK (shine BETWEEN 1 AND 5),
  breakage SMALLINT NULL CHECK (breakage BETWEEN 1 AND 5),
  note TEXT NULL,
  evolution_photo_id UUID NULL REFERENCES public.evolution_photos(id) ON DELETE SET NULL,
  scheduled_focus_snapshot TEXT NULL,
  extra JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT diary_entries_user_entry_unique UNIQUE (user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_diary_entries_user_date
ON public.diary_entries (user_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_diary_entries_user_treatments
ON public.diary_entries USING GIN (treatments);

ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own diary entries with plan access"
ON public.diary_entries
FOR SELECT
USING (
  auth.uid() = user_id
  AND public.current_user_has_feature_access('diario-capilar')
);

CREATE POLICY "Users insert own diary entries with plan access"
ON public.diary_entries
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.current_user_has_feature_access('diario-capilar')
);

CREATE POLICY "Users update own diary entries with plan access"
ON public.diary_entries
FOR UPDATE
USING (
  auth.uid() = user_id
  AND public.current_user_has_feature_access('diario-capilar')
)
WITH CHECK (
  auth.uid() = user_id
  AND public.current_user_has_feature_access('diario-capilar')
);

CREATE POLICY "Users delete own diary entries with plan access"
ON public.diary_entries
FOR DELETE
USING (
  auth.uid() = user_id
  AND public.current_user_has_feature_access('diario-capilar')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.diary_entries TO authenticated;

CREATE TRIGGER update_diary_entries_updated_at
BEFORE UPDATE ON public.diary_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.check_diary_entry_photo_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.evolution_photo_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.evolution_photos photos
      WHERE photos.id = NEW.evolution_photo_id
        AND photos.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'evolution_photo_id does not belong to the diary entry user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS diary_entries_enforce_photo_owner ON public.diary_entries;
CREATE TRIGGER diary_entries_enforce_photo_owner
BEFORE INSERT OR UPDATE ON public.diary_entries
FOR EACH ROW EXECUTE FUNCTION public.check_diary_entry_photo_owner();

INSERT INTO public.subscription_features (
  feature_key,
  name,
  description,
  category,
  display_order,
  is_active
)
VALUES
  (
    'diario-capilar',
    'Diário Capilar',
    'Permite registrar o cuidado diario do cabelo com tratamentos, percepcao e foto opcional.',
    'Diário',
    15,
    true
  ),
  (
    'diario-completo',
    'Diário Completo',
    'Desbloqueia metricas avancadas, gamificacao e historico extendido do diario capilar.',
    'Diário',
    16,
    true
  )
ON CONFLICT (feature_key) DO NOTHING;

INSERT INTO public.plan_feature_access (
  plan_id,
  feature_id,
  is_enabled
)
SELECT
  plans.id,
  features.id,
  CASE
    WHEN plans.slug = 'premium' THEN true
    WHEN plans.slug = 'essencial' THEN features.feature_key IN (
      'diario-capilar',
      'diario-completo'
    )
    WHEN plans.slug = 'gratuito' THEN features.feature_key IN (
      'diario-capilar'
    )
    ELSE false
  END
FROM public.subscription_plans plans
CROSS JOIN public.subscription_features features
WHERE features.feature_key IN ('diario-capilar', 'diario-completo')
ON CONFLICT (plan_id, feature_id) DO NOTHING;
