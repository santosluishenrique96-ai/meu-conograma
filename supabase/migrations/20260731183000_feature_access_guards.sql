CREATE OR REPLACE FUNCTION public.user_has_feature_access(
  target_user_id UUID,
  required_feature_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_plan_id UUID;
BEGIN
  IF target_user_id IS NULL OR COALESCE(BTRIM(required_feature_key), '') = '' THEN
    RETURN false;
  END IF;

  IF public.is_store_admin(target_user_id) THEN
    RETURN true;
  END IF;

  SELECT current_plan_id
  INTO resolved_plan_id
  FROM public.user_subscription_state
  WHERE user_id = target_user_id;

  IF resolved_plan_id IS NULL THEN
    SELECT id
    INTO resolved_plan_id
    FROM public.subscription_plans
    WHERE slug = 'gratuito'
    LIMIT 1;
  END IF;

  IF resolved_plan_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.subscription_features features
    INNER JOIN public.plan_feature_access access
      ON access.feature_id = features.id
    WHERE features.feature_key = required_feature_key
      AND features.is_active = true
      AND access.plan_id = resolved_plan_id
      AND access.is_enabled = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_feature_access(required_feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_feature_access(auth.uid(), required_feature_key);
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_feature_access(required_feature_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  feature_record public.subscription_features%ROWTYPE;
  current_plan_record public.subscription_plans%ROWTYPE;
  recommended_plan_record public.subscription_plans%ROWTYPE;
  state_record public.user_subscription_state%ROWTYPE;
  has_access BOOLEAN := false;
  reason TEXT := 'upgrade_required';
BEGIN
  SELECT *
  INTO feature_record
  FROM public.subscription_features
  WHERE feature_key = required_feature_key
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'feature_key', required_feature_key,
      'feature_name', NULL,
      'feature_description', NULL,
      'has_access', false,
      'current_plan_id', NULL,
      'current_plan_name', NULL,
      'current_plan_slug', NULL,
      'subscription_status', NULL,
      'recommended_plan_id', NULL,
      'recommended_plan_name', NULL,
      'recommended_plan_slug', NULL,
      'reason', 'feature_not_found'
    );
  END IF;

  SELECT plans.*
  INTO recommended_plan_record
  FROM public.subscription_plans plans
  INNER JOIN public.plan_feature_access access
    ON access.plan_id = plans.id
  WHERE access.is_enabled = true
    AND plans.is_active = true
    AND access.feature_id = feature_record.id
  ORDER BY plans.display_order ASC, plans.created_at ASC
  LIMIT 1;

  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'feature_key', feature_record.feature_key,
      'feature_name', feature_record.name,
      'feature_description', feature_record.description,
      'has_access', false,
      'current_plan_id', NULL,
      'current_plan_name', NULL,
      'current_plan_slug', NULL,
      'subscription_status', NULL,
      'recommended_plan_id', recommended_plan_record.id,
      'recommended_plan_name', recommended_plan_record.name,
      'recommended_plan_slug', recommended_plan_record.slug,
      'reason', 'unauthenticated'
    );
  END IF;

  SELECT *
  INTO state_record
  FROM public.user_subscription_state
  WHERE user_id = current_user_id;

  IF state_record.current_plan_id IS NOT NULL THEN
    SELECT *
    INTO current_plan_record
    FROM public.subscription_plans
    WHERE id = state_record.current_plan_id
    LIMIT 1;
  END IF;

  IF current_plan_record.id IS NULL THEN
    SELECT *
    INTO current_plan_record
    FROM public.subscription_plans
    WHERE slug = 'gratuito'
    LIMIT 1;
  END IF;

  has_access := public.user_has_feature_access(current_user_id, required_feature_key);

  IF has_access THEN
    reason := 'allowed';
  ELSIF NOT feature_record.is_active THEN
    reason := 'feature_inactive';
  ELSIF current_plan_record.id IS NULL THEN
    reason := 'plan_not_found';
  END IF;

  RETURN jsonb_build_object(
    'feature_key', feature_record.feature_key,
    'feature_name', feature_record.name,
    'feature_description', feature_record.description,
    'has_access', has_access,
    'current_plan_id', current_plan_record.id,
    'current_plan_name', current_plan_record.name,
    'current_plan_slug', current_plan_record.slug,
    'subscription_status', COALESCE(state_record.status, 'draft'),
    'recommended_plan_id', recommended_plan_record.id,
    'recommended_plan_name', recommended_plan_record.name,
    'recommended_plan_slug', recommended_plan_record.slug,
    'reason', reason
  );
END;
$$;

DROP POLICY IF EXISTS "Users view own prefs" ON public.schedule_preferences;
DROP POLICY IF EXISTS "Users insert own prefs" ON public.schedule_preferences;
DROP POLICY IF EXISTS "Users update own prefs" ON public.schedule_preferences;

CREATE POLICY "Users view own prefs with plan access"
ON public.schedule_preferences
FOR SELECT
USING (
  auth.uid() = user_id
  AND public.current_user_has_feature_access('cronograma-personalizado')
);

CREATE POLICY "Users insert own prefs with plan access"
ON public.schedule_preferences
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.current_user_has_feature_access('cronograma-personalizado')
);

CREATE POLICY "Users update own prefs with plan access"
ON public.schedule_preferences
FOR UPDATE
USING (
  auth.uid() = user_id
  AND public.current_user_has_feature_access('cronograma-personalizado')
)
WITH CHECK (
  auth.uid() = user_id
  AND public.current_user_has_feature_access('cronograma-personalizado')
);

DROP POLICY IF EXISTS "Users view own photos" ON public.evolution_photos;
DROP POLICY IF EXISTS "Users insert own photos" ON public.evolution_photos;
DROP POLICY IF EXISTS "Users update own photos" ON public.evolution_photos;
DROP POLICY IF EXISTS "Users delete own photos" ON public.evolution_photos;

CREATE POLICY "Users view own photos with plan access"
ON public.evolution_photos
FOR SELECT
USING (
  auth.uid() = user_id
  AND public.current_user_has_feature_access('fotos')
);

CREATE POLICY "Users insert own photos with plan access"
ON public.evolution_photos
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.current_user_has_feature_access('fotos')
);

CREATE POLICY "Users update own photos with plan access"
ON public.evolution_photos
FOR UPDATE
USING (
  auth.uid() = user_id
  AND public.current_user_has_feature_access('fotos')
)
WITH CHECK (
  auth.uid() = user_id
  AND public.current_user_has_feature_access('fotos')
);

CREATE POLICY "Users delete own photos with plan access"
ON public.evolution_photos
FOR DELETE
USING (
  auth.uid() = user_id
  AND public.current_user_has_feature_access('fotos')
);

DROP POLICY IF EXISTS "Evolution photos public read" ON storage.objects;
DROP POLICY IF EXISTS "Users list own evolution photos" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own evolution photos" ON storage.objects;
DROP POLICY IF EXISTS "Users update own evolution photos" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own evolution photos" ON storage.objects;

CREATE POLICY "Users list own evolution photos with plan access"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'evolution-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.current_user_has_feature_access('fotos')
);

CREATE POLICY "Users upload own evolution photos with plan access"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'evolution-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.current_user_has_feature_access('fotos')
);

CREATE POLICY "Users update own evolution photos with plan access"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'evolution-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.current_user_has_feature_access('fotos')
);

CREATE POLICY "Users delete own evolution photos with plan access"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'evolution-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.current_user_has_feature_access('fotos')
);

GRANT EXECUTE ON FUNCTION public.user_has_feature_access(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_feature_access(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_feature_access(TEXT) TO anon, authenticated;
