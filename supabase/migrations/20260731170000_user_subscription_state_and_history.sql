ALTER TABLE public.user_subscriptions
ADD COLUMN started_at TIMESTAMPTZ,
ADD COLUMN due_at TIMESTAMPTZ,
ADD COLUMN auto_renew BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN trial_used BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN trial_days_snapshot INTEGER NOT NULL DEFAULT 0,
ADD COLUMN renewal_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN origin TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.user_subscriptions
ADD CONSTRAINT user_subscriptions_trial_days_snapshot_check CHECK (trial_days_snapshot >= 0);

ALTER TABLE public.user_subscriptions
ADD CONSTRAINT user_subscriptions_renewal_count_check CHECK (renewal_count >= 0);

CREATE TABLE public.user_subscription_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  current_plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  started_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  trial_starts_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  trial_used BOOLEAN NOT NULL DEFAULT false,
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  renewal_count INTEGER NOT NULL DEFAULT 0,
  last_history_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_subscription_state_status_check CHECK (
    status IN ('draft', 'trialing', 'active', 'past_due', 'canceled', 'expired', 'incomplete')
  ),
  CONSTRAINT user_subscription_state_renewal_count_check CHECK (renewal_count >= 0)
);

CREATE INDEX idx_user_subscription_state_plan
ON public.user_subscription_state (current_plan_id, updated_at DESC);

ALTER TABLE public.user_subscription_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription state"
ON public.user_subscription_state
FOR SELECT
USING (auth.uid() = user_id OR public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins manage subscription state"
ON public.user_subscription_state
FOR ALL
USING (public.is_store_admin(auth.uid()))
WITH CHECK (public.is_store_admin(auth.uid()));

GRANT SELECT ON TABLE public.user_subscription_state TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.user_subscription_state TO authenticated;

CREATE TRIGGER update_user_subscription_state_updated_at
BEFORE UPDATE ON public.user_subscription_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_subscription_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  trial_starts_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_subscription_history_status_check CHECK (
    status IN ('draft', 'trialing', 'active', 'past_due', 'canceled', 'expired', 'incomplete')
  )
);

CREATE INDEX idx_user_subscription_history_user
ON public.user_subscription_history (user_id, created_at DESC);

CREATE INDEX idx_user_subscription_history_subscription
ON public.user_subscription_history (subscription_id, created_at DESC);

ALTER TABLE public.user_subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription history"
ON public.user_subscription_history
FOR SELECT
USING (auth.uid() = user_id OR public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins manage subscription history"
ON public.user_subscription_history
FOR ALL
USING (public.is_store_admin(auth.uid()))
WITH CHECK (public.is_store_admin(auth.uid()));

GRANT SELECT ON TABLE public.user_subscription_history TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.user_subscription_history TO authenticated;

CREATE OR REPLACE FUNCTION public.get_default_subscription_plan_id()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT id
  FROM public.subscription_plans
  WHERE slug = 'gratuito'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.sync_user_subscription_state(
  target_subscription_id UUID,
  sync_event_type TEXT DEFAULT 'subscription_updated'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_record public.user_subscriptions%ROWTYPE;
BEGIN
  SELECT *
  INTO subscription_record
  FROM public.user_subscriptions
  WHERE id = target_subscription_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.user_subscription_state (
    user_id,
    current_subscription_id,
    current_plan_id,
    status,
    started_at,
    due_at,
    trial_starts_at,
    trial_ends_at,
    trial_used,
    auto_renew,
    renewal_count,
    last_history_event_at
  )
  VALUES (
    subscription_record.user_id,
    subscription_record.id,
    subscription_record.plan_id,
    subscription_record.status,
    subscription_record.started_at,
    subscription_record.due_at,
    subscription_record.trial_starts_at,
    subscription_record.trial_ends_at,
    subscription_record.trial_used,
    subscription_record.auto_renew,
    subscription_record.renewal_count,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    current_subscription_id = EXCLUDED.current_subscription_id,
    current_plan_id = EXCLUDED.current_plan_id,
    status = EXCLUDED.status,
    started_at = EXCLUDED.started_at,
    due_at = EXCLUDED.due_at,
    trial_starts_at = EXCLUDED.trial_starts_at,
    trial_ends_at = EXCLUDED.trial_ends_at,
    trial_used = EXCLUDED.trial_used,
    auto_renew = EXCLUDED.auto_renew,
    renewal_count = EXCLUDED.renewal_count,
    last_history_event_at = EXCLUDED.last_history_event_at;

  INSERT INTO public.user_subscription_history (
    user_id,
    subscription_id,
    plan_id,
    event_type,
    status,
    started_at,
    due_at,
    trial_starts_at,
    trial_ends_at,
    auto_renew,
    payload
  )
  SELECT
    subscription_record.user_id,
    subscription_record.id,
    subscription_record.plan_id,
    CASE
      WHEN sync_event_type = 'subscription_created' THEN 'subscription_created'
      ELSE 'subscription_updated'
    END,
    subscription_record.status,
    subscription_record.started_at,
    subscription_record.due_at,
    subscription_record.trial_starts_at,
    subscription_record.trial_ends_at,
    subscription_record.auto_renew,
    jsonb_build_object(
      'billing_interval', subscription_record.billing_interval,
      'price_snapshot', subscription_record.price_snapshot,
      'origin', subscription_record.origin,
      'renewal_count', subscription_record.renewal_count,
      'provider', subscription_record.provider
    )
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_subscription_history history
    WHERE history.subscription_id = subscription_record.id
      AND history.status = subscription_record.status
      AND history.event_type = CASE
        WHEN sync_event_type = 'subscription_created' THEN 'subscription_created'
        ELSE 'subscription_updated'
      END
      AND history.created_at > now() - interval '2 seconds'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_user_subscription_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.started_at := COALESCE(NEW.started_at, NEW.current_period_starts_at, NEW.trial_starts_at, NEW.created_at, now());
  NEW.due_at := COALESCE(NEW.due_at, NEW.current_period_ends_at, NEW.trial_ends_at, NEW.ends_at);
  NEW.trial_used := COALESCE(NEW.trial_used, false) OR NEW.trial_ends_at IS NOT NULL;
  NEW.trial_days_snapshot := CASE
    WHEN COALESCE(NEW.trial_days_snapshot, 0) > 0 THEN NEW.trial_days_snapshot
    ELSE COALESCE(
      (SELECT free_trial_days FROM public.subscription_plans WHERE id = NEW.plan_id),
      0
    )
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prepare_user_subscription_row_before_write
BEFORE INSERT OR UPDATE ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.prepare_user_subscription_row();

CREATE OR REPLACE FUNCTION public.handle_user_subscription_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_user_subscription_state(
    NEW.id,
    CASE WHEN TG_OP = 'INSERT' THEN 'subscription_created' ELSE 'subscription_updated' END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_subscription_changed
AFTER INSERT OR UPDATE ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.handle_user_subscription_change();

CREATE OR REPLACE FUNCTION public.provision_default_subscription_for_user(target_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_plan_id UUID;
  existing_subscription_id UUID;
  default_plan_trial_days INTEGER;
  created_subscription_id UUID;
BEGIN
  SELECT public.get_default_subscription_plan_id()
  INTO default_plan_id;

  IF default_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plano gratuito nao encontrado para provisionar assinatura padrao';
  END IF;

  SELECT id
  INTO existing_subscription_id
  FROM public.user_subscriptions
  WHERE user_id = target_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing_subscription_id IS NOT NULL THEN
    PERFORM public.sync_user_subscription_state(existing_subscription_id, 'subscription_updated');
    RETURN existing_subscription_id;
  END IF;

  SELECT free_trial_days
  INTO default_plan_trial_days
  FROM public.subscription_plans
  WHERE id = default_plan_id;

  INSERT INTO public.user_subscriptions (
    user_id,
    plan_id,
    status,
    billing_interval,
    price_snapshot,
    currency_code,
    trial_starts_at,
    trial_ends_at,
    current_period_starts_at,
    current_period_ends_at,
    started_at,
    due_at,
    auto_renew,
    trial_used,
    trial_days_snapshot,
    origin,
    provider,
    metadata
  )
  VALUES (
    target_user_id,
    default_plan_id,
    CASE WHEN COALESCE(default_plan_trial_days, 0) > 0 THEN 'trialing' ELSE 'active' END,
    'monthly',
    0,
    'BRL',
    CASE WHEN COALESCE(default_plan_trial_days, 0) > 0 THEN now() ELSE NULL END,
    CASE
      WHEN COALESCE(default_plan_trial_days, 0) > 0
      THEN now() + make_interval(days => default_plan_trial_days)
      ELSE NULL
    END,
    now(),
    NULL,
    now(),
    NULL,
    false,
    COALESCE(default_plan_trial_days, 0) > 0,
    COALESCE(default_plan_trial_days, 0),
    'signup',
    'manual',
    jsonb_build_object('bootstrap_source', 'auth_signup')
  )
  RETURNING id INTO created_subscription_id;

  RETURN created_subscription_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.provision_default_subscription_for_user(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_subscription_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

CREATE OR REPLACE FUNCTION public.provision_current_user_subscription()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado para provisionar assinatura';
  END IF;

  RETURN public.provision_default_subscription_for_user(auth.uid());
END;
$$;

INSERT INTO public.user_subscriptions (
  user_id,
  plan_id,
  status,
  billing_interval,
  price_snapshot,
  currency_code,
  current_period_starts_at,
  started_at,
  auto_renew,
  trial_used,
  trial_days_snapshot,
  origin,
  provider,
  metadata
)
SELECT
  users.id,
  public.get_default_subscription_plan_id(),
  'active',
  'monthly',
  0,
  'BRL',
  now(),
  now(),
  false,
  false,
  COALESCE((SELECT free_trial_days FROM public.subscription_plans WHERE id = public.get_default_subscription_plan_id()), 0),
  'migration_backfill',
  'manual',
  jsonb_build_object('bootstrap_source', 'migration_backfill')
FROM auth.users users
WHERE public.get_default_subscription_plan_id() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_subscriptions subscriptions
    WHERE subscriptions.user_id = users.id
  );

UPDATE public.user_subscriptions
SET
  started_at = COALESCE(started_at, current_period_starts_at, trial_starts_at, created_at),
  due_at = COALESCE(due_at, current_period_ends_at, trial_ends_at, ends_at),
  trial_days_snapshot = CASE
    WHEN trial_days_snapshot > 0 THEN trial_days_snapshot
    ELSE COALESCE(
      (SELECT free_trial_days FROM public.subscription_plans WHERE id = plan_id),
      0
    )
  END,
  trial_used = trial_used OR trial_ends_at IS NOT NULL
WHERE started_at IS NULL
   OR due_at IS NULL
   OR trial_days_snapshot = 0
   OR (trial_used = false AND trial_ends_at IS NOT NULL);

INSERT INTO public.user_subscription_state (
  user_id,
  current_subscription_id,
  current_plan_id,
  status,
  started_at,
  due_at,
  trial_starts_at,
  trial_ends_at,
  trial_used,
  auto_renew,
  renewal_count,
  last_history_event_at
)
SELECT DISTINCT ON (subscriptions.user_id)
  subscriptions.user_id,
  subscriptions.id,
  subscriptions.plan_id,
  subscriptions.status,
  subscriptions.started_at,
  subscriptions.due_at,
  subscriptions.trial_starts_at,
  subscriptions.trial_ends_at,
  subscriptions.trial_used,
  subscriptions.auto_renew,
  subscriptions.renewal_count,
  now()
FROM public.user_subscriptions subscriptions
ORDER BY subscriptions.user_id, subscriptions.created_at DESC
ON CONFLICT (user_id) DO UPDATE
SET
  current_subscription_id = EXCLUDED.current_subscription_id,
  current_plan_id = EXCLUDED.current_plan_id,
  status = EXCLUDED.status,
  started_at = EXCLUDED.started_at,
  due_at = EXCLUDED.due_at,
  trial_starts_at = EXCLUDED.trial_starts_at,
  trial_ends_at = EXCLUDED.trial_ends_at,
  trial_used = EXCLUDED.trial_used,
  auto_renew = EXCLUDED.auto_renew,
  renewal_count = EXCLUDED.renewal_count,
  last_history_event_at = EXCLUDED.last_history_event_at;

INSERT INTO public.user_subscription_history (
  user_id,
  subscription_id,
  plan_id,
  event_type,
  status,
  started_at,
  due_at,
  trial_starts_at,
  trial_ends_at,
  auto_renew,
  payload
)
SELECT
  subscriptions.user_id,
  subscriptions.id,
  subscriptions.plan_id,
  'migration_snapshot',
  subscriptions.status,
  subscriptions.started_at,
  subscriptions.due_at,
  subscriptions.trial_starts_at,
  subscriptions.trial_ends_at,
  subscriptions.auto_renew,
  jsonb_build_object(
    'billing_interval', subscriptions.billing_interval,
    'price_snapshot', subscriptions.price_snapshot,
    'origin', subscriptions.origin,
    'renewal_count', subscriptions.renewal_count,
    'provider', subscriptions.provider
  )
FROM public.user_subscriptions subscriptions
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_subscription_history history
  WHERE history.subscription_id = subscriptions.id
);

GRANT EXECUTE ON FUNCTION public.get_default_subscription_plan_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_current_user_subscription() TO authenticated;
