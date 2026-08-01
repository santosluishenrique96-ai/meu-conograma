ALTER TABLE public.billing_checkout_sessions
DROP CONSTRAINT IF EXISTS billing_checkout_sessions_external_checkout_id_key;

ALTER TABLE public.billing_checkout_sessions
DROP CONSTRAINT IF EXISTS billing_checkout_sessions_gateway_external_checkout_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_checkout_sessions_gateway_external_checkout_id
ON public.billing_checkout_sessions (gateway, external_checkout_id)
WHERE external_checkout_id IS NOT NULL;

ALTER TABLE public.billing_invoices
DROP CONSTRAINT IF EXISTS billing_invoices_external_invoice_id_key;

ALTER TABLE public.billing_invoices
DROP CONSTRAINT IF EXISTS billing_invoices_gateway_external_invoice_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_invoices_gateway_external_invoice_id
ON public.billing_invoices (gateway, external_invoice_id)
WHERE external_invoice_id IS NOT NULL;

ALTER TABLE public.billing_webhook_events
DROP CONSTRAINT IF EXISTS billing_webhook_events_external_event_id_key;

ALTER TABLE public.billing_webhook_events
DROP CONSTRAINT IF EXISTS billing_webhook_events_gateway_external_event_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_webhook_events_gateway_external_event_id
ON public.billing_webhook_events (gateway, external_event_id);

CREATE OR REPLACE FUNCTION public.register_billing_webhook_event(
  target_gateway TEXT,
  target_event_type TEXT,
  target_external_event_id TEXT,
  target_payload JSONB DEFAULT '{}'::jsonb,
  target_signature TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.billing_webhook_events (
    gateway,
    event_type,
    external_event_id,
    signature,
    payload
  )
  VALUES (
    target_gateway,
    target_event_type,
    target_external_event_id,
    target_signature,
    COALESCE(target_payload, '{}'::jsonb)
  )
  ON CONFLICT (gateway, external_event_id) DO UPDATE
  SET
    event_type = EXCLUDED.event_type,
    signature = EXCLUDED.signature,
    payload = EXCLUDED.payload,
    event_status = 'pending',
    last_error = NULL,
    processed_at = NULL
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_billing_invoice(
  target_user_id UUID,
  target_subscription_id UUID DEFAULT NULL,
  target_plan_id UUID DEFAULT NULL,
  target_gateway TEXT DEFAULT 'mercado-pago',
  target_status TEXT DEFAULT 'open',
  target_billing_reason TEXT DEFAULT 'manual',
  target_external_invoice_id TEXT DEFAULT NULL,
  target_amount_due NUMERIC(10, 2) DEFAULT 0,
  target_amount_paid NUMERIC(10, 2) DEFAULT 0,
  target_amount_refunded NUMERIC(10, 2) DEFAULT 0,
  target_currency_code TEXT DEFAULT 'BRL',
  target_period_start TIMESTAMPTZ DEFAULT NULL,
  target_period_end TIMESTAMPTZ DEFAULT NULL,
  target_due_at TIMESTAMPTZ DEFAULT NULL,
  target_paid_at TIMESTAMPTZ DEFAULT NULL,
  target_invoice_url TEXT DEFAULT NULL,
  target_hosted_invoice_url TEXT DEFAULT NULL,
  target_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_id UUID;
BEGIN
  INSERT INTO public.billing_invoices (
    user_id,
    subscription_id,
    plan_id,
    gateway,
    status,
    billing_reason,
    external_invoice_id,
    amount_due,
    amount_paid,
    amount_refunded,
    currency_code,
    period_start,
    period_end,
    due_at,
    paid_at,
    invoice_url,
    hosted_invoice_url,
    metadata
  )
  VALUES (
    target_user_id,
    target_subscription_id,
    target_plan_id,
    target_gateway,
    target_status,
    target_billing_reason,
    target_external_invoice_id,
    COALESCE(target_amount_due, 0),
    COALESCE(target_amount_paid, 0),
    COALESCE(target_amount_refunded, 0),
    target_currency_code,
    target_period_start,
    target_period_end,
    target_due_at,
    target_paid_at,
    target_invoice_url,
    target_hosted_invoice_url,
    COALESCE(target_metadata, '{}'::jsonb)
  )
  ON CONFLICT (gateway, external_invoice_id) DO UPDATE
  SET
    subscription_id = EXCLUDED.subscription_id,
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    billing_reason = EXCLUDED.billing_reason,
    amount_due = EXCLUDED.amount_due,
    amount_paid = EXCLUDED.amount_paid,
    amount_refunded = EXCLUDED.amount_refunded,
    currency_code = EXCLUDED.currency_code,
    period_start = EXCLUDED.period_start,
    period_end = EXCLUDED.period_end,
    due_at = EXCLUDED.due_at,
    paid_at = EXCLUDED.paid_at,
    invoice_url = EXCLUDED.invoice_url,
    hosted_invoice_url = EXCLUDED.hosted_invoice_url,
    metadata = EXCLUDED.metadata
  RETURNING id INTO invoice_id;

  RETURN invoice_id;
END;
$$;

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
  ORDER BY
    CASE
      WHEN status IN ('trialing', 'active', 'past_due', 'incomplete') THEN 0
      ELSE 1
    END,
    created_at DESC
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
