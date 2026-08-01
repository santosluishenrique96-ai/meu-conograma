CREATE TABLE public.billing_checkout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  gateway TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  amount_snapshot NUMERIC(10, 2),
  currency_code TEXT NOT NULL DEFAULT 'BRL',
  checkout_url TEXT,
  external_checkout_id TEXT,
  external_customer_id TEXT,
  external_subscription_id TEXT,
  success_url TEXT,
  cancel_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT billing_checkout_sessions_gateway_check CHECK (
    gateway IN (
      'stripe',
      'mercado-pago',
      'asaas',
      'pagseguro',
      'kirvano',
      'kiwify',
      'hotmart',
      'eduzz',
      'monetizze'
    )
  ),
  CONSTRAINT billing_checkout_sessions_action_check CHECK (
    action IN ('subscribe', 'upgrade', 'downgrade', 'reactivate')
  ),
  CONSTRAINT billing_checkout_sessions_status_check CHECK (
    status IN ('draft', 'pending', 'completed', 'expired', 'canceled', 'failed')
  ),
  CONSTRAINT billing_checkout_sessions_interval_check CHECK (
    billing_interval IN ('monthly', 'annual')
  ),
  CONSTRAINT billing_checkout_sessions_amount_check CHECK (
    amount_snapshot IS NULL OR amount_snapshot >= 0
  ),
  CONSTRAINT billing_checkout_sessions_gateway_external_checkout_id_key UNIQUE (
    gateway,
    external_checkout_id
  )
);

CREATE INDEX idx_billing_checkout_sessions_user
ON public.billing_checkout_sessions (user_id, created_at DESC);

CREATE INDEX idx_billing_checkout_sessions_subscription
ON public.billing_checkout_sessions (subscription_id, created_at DESC);

ALTER TABLE public.billing_checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own billing checkout sessions"
ON public.billing_checkout_sessions
FOR SELECT
USING (auth.uid() = user_id OR public.is_store_admin(auth.uid()));

CREATE POLICY "Users create own billing checkout sessions"
ON public.billing_checkout_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins manage billing checkout sessions"
ON public.billing_checkout_sessions
FOR UPDATE
USING (public.is_store_admin(auth.uid()))
WITH CHECK (public.is_store_admin(auth.uid()));

GRANT SELECT, INSERT ON TABLE public.billing_checkout_sessions TO authenticated;
GRANT UPDATE ON TABLE public.billing_checkout_sessions TO authenticated;

CREATE TRIGGER update_billing_checkout_sessions_updated_at
BEFORE UPDATE ON public.billing_checkout_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.billing_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  gateway TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  billing_reason TEXT NOT NULL DEFAULT 'manual',
  external_invoice_id TEXT,
  amount_due NUMERIC(10, 2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
  amount_refunded NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'BRL',
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  invoice_url TEXT,
  hosted_invoice_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT billing_invoices_gateway_check CHECK (
    gateway IN (
      'stripe',
      'mercado-pago',
      'asaas',
      'pagseguro',
      'kirvano',
      'kiwify',
      'hotmart',
      'eduzz',
      'monetizze'
    )
  ),
  CONSTRAINT billing_invoices_status_check CHECK (
    status IN ('draft', 'open', 'paid', 'past_due', 'void', 'uncollectible', 'refunded', 'failed')
  ),
  CONSTRAINT billing_invoices_amount_due_check CHECK (amount_due >= 0),
  CONSTRAINT billing_invoices_amount_paid_check CHECK (amount_paid >= 0),
  CONSTRAINT billing_invoices_amount_refunded_check CHECK (amount_refunded >= 0),
  CONSTRAINT billing_invoices_gateway_external_invoice_id_key UNIQUE (
    gateway,
    external_invoice_id
  )
);

CREATE INDEX idx_billing_invoices_user
ON public.billing_invoices (user_id, created_at DESC);

CREATE INDEX idx_billing_invoices_subscription
ON public.billing_invoices (subscription_id, created_at DESC);

ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own billing invoices"
ON public.billing_invoices
FOR SELECT
USING (auth.uid() = user_id OR public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins manage billing invoices"
ON public.billing_invoices
FOR ALL
USING (public.is_store_admin(auth.uid()))
WITH CHECK (public.is_store_admin(auth.uid()));

GRANT SELECT ON TABLE public.billing_invoices TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.billing_invoices TO authenticated;

CREATE TRIGGER update_billing_invoices_updated_at
BEFORE UPDATE ON public.billing_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.billing_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_status TEXT NOT NULL DEFAULT 'pending',
  external_event_id TEXT NOT NULL,
  signature TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT billing_webhook_events_gateway_check CHECK (
    gateway IN (
      'stripe',
      'mercado-pago',
      'asaas',
      'pagseguro',
      'kirvano',
      'kiwify',
      'hotmart',
      'eduzz',
      'monetizze'
    )
  ),
  CONSTRAINT billing_webhook_events_status_check CHECK (
    event_status IN ('pending', 'processed', 'ignored', 'failed')
  ),
  CONSTRAINT billing_webhook_events_gateway_external_event_id_key UNIQUE (
    gateway,
    external_event_id
  )
);

CREATE INDEX idx_billing_webhook_events_gateway
ON public.billing_webhook_events (gateway, created_at DESC);

ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store admins view billing webhook events"
ON public.billing_webhook_events
FOR SELECT
USING (public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins manage billing webhook events"
ON public.billing_webhook_events
FOR ALL
USING (public.is_store_admin(auth.uid()))
WITH CHECK (public.is_store_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_webhook_events TO authenticated;

CREATE TRIGGER update_billing_webhook_events_updated_at
BEFORE UPDATE ON public.billing_webhook_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.record_billing_checkout_session(
  target_plan_id UUID,
  target_gateway TEXT,
  target_action TEXT,
  target_billing_interval TEXT DEFAULT 'monthly',
  target_subscription_id UUID DEFAULT NULL,
  target_amount_snapshot NUMERIC(10, 2) DEFAULT NULL,
  target_currency_code TEXT DEFAULT 'BRL',
  target_checkout_url TEXT DEFAULT NULL,
  target_success_url TEXT DEFAULT NULL,
  target_cancel_url TEXT DEFAULT NULL,
  target_metadata JSONB DEFAULT '{}'::jsonb,
  target_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_session_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  INSERT INTO public.billing_checkout_sessions (
    user_id,
    subscription_id,
    plan_id,
    gateway,
    action,
    status,
    billing_interval,
    amount_snapshot,
    currency_code,
    checkout_url,
    success_url,
    cancel_url,
    metadata,
    expires_at
  )
  VALUES (
    auth.uid(),
    target_subscription_id,
    target_plan_id,
    target_gateway,
    target_action,
    CASE WHEN target_checkout_url IS NULL THEN 'draft' ELSE 'pending' END,
    target_billing_interval,
    target_amount_snapshot,
    target_currency_code,
    target_checkout_url,
    target_success_url,
    target_cancel_url,
    COALESCE(target_metadata, '{}'::jsonb),
    COALESCE(target_expires_at, now() + interval '30 minutes')
  )
  RETURNING id INTO created_session_id;

  RETURN created_session_id;
END;
$$;

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
    gateway = EXCLUDED.gateway,
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
    gateway = EXCLUDED.gateway,
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

CREATE OR REPLACE FUNCTION public.apply_billing_subscription_event(
  target_user_id UUID,
  target_plan_id UUID,
  target_gateway TEXT,
  lifecycle_event TEXT,
  next_status TEXT,
  target_billing_interval TEXT DEFAULT 'monthly',
  target_subscription_id UUID DEFAULT NULL,
  target_external_customer_id TEXT DEFAULT NULL,
  target_external_subscription_id TEXT DEFAULT NULL,
  target_external_reference TEXT DEFAULT NULL,
  target_price_snapshot NUMERIC(10, 2) DEFAULT NULL,
  target_currency_code TEXT DEFAULT 'BRL',
  target_current_period_starts_at TIMESTAMPTZ DEFAULT NULL,
  target_current_period_ends_at TIMESTAMPTZ DEFAULT NULL,
  target_due_at TIMESTAMPTZ DEFAULT NULL,
  target_trial_starts_at TIMESTAMPTZ DEFAULT NULL,
  target_trial_ends_at TIMESTAMPTZ DEFAULT NULL,
  target_auto_renew BOOLEAN DEFAULT true,
  target_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_record public.user_subscriptions%ROWTYPE;
  resolved_subscription_id UUID;
BEGIN
  IF target_subscription_id IS NOT NULL THEN
    SELECT *
    INTO target_record
    FROM public.user_subscriptions
    WHERE id = target_subscription_id
      AND user_id = target_user_id;
  END IF;

  IF NOT FOUND THEN
    SELECT *
    INTO target_record
    FROM public.user_subscriptions
    WHERE user_id = target_user_id
    ORDER BY
      CASE
        WHEN status IN ('trialing', 'active', 'past_due', 'incomplete') THEN 0
        ELSE 1
      END,
      created_at DESC
    LIMIT 1;
  END IF;

  IF target_record.id IS NULL THEN
    INSERT INTO public.user_subscriptions (
      user_id,
      plan_id,
      status,
      billing_interval,
      price_snapshot,
      currency_code,
      provider,
      provider_customer_id,
      provider_subscription_id,
      external_reference,
      current_period_starts_at,
      current_period_ends_at,
      due_at,
      trial_starts_at,
      trial_ends_at,
      auto_renew,
      origin,
      metadata
    )
    VALUES (
      target_user_id,
      target_plan_id,
      next_status,
      target_billing_interval,
      target_price_snapshot,
      target_currency_code,
      target_gateway,
      target_external_customer_id,
      target_external_subscription_id,
      target_external_reference,
      target_current_period_starts_at,
      target_current_period_ends_at,
      COALESCE(target_due_at, target_current_period_ends_at),
      target_trial_starts_at,
      target_trial_ends_at,
      COALESCE(target_auto_renew, true),
      'checkout',
      COALESCE(target_metadata, '{}'::jsonb)
    )
    RETURNING * INTO target_record;
  ELSE
    UPDATE public.user_subscriptions
    SET
      plan_id = target_plan_id,
      status = next_status,
      billing_interval = target_billing_interval,
      price_snapshot = COALESCE(target_price_snapshot, price_snapshot),
      currency_code = COALESCE(target_currency_code, currency_code),
      provider = COALESCE(target_gateway, provider),
      provider_customer_id = COALESCE(target_external_customer_id, provider_customer_id),
      provider_subscription_id = COALESCE(target_external_subscription_id, provider_subscription_id),
      external_reference = COALESCE(target_external_reference, external_reference),
      current_period_starts_at = COALESCE(target_current_period_starts_at, current_period_starts_at),
      current_period_ends_at = COALESCE(target_current_period_ends_at, current_period_ends_at),
      due_at = COALESCE(target_due_at, target_current_period_ends_at, due_at),
      trial_starts_at = COALESCE(target_trial_starts_at, trial_starts_at),
      trial_ends_at = COALESCE(target_trial_ends_at, trial_ends_at),
      auto_renew = COALESCE(target_auto_renew, auto_renew),
      renewal_count = CASE
        WHEN lifecycle_event = 'renewed' THEN COALESCE(renewal_count, 0) + 1
        ELSE renewal_count
      END,
      canceled_at = CASE
        WHEN next_status = 'canceled' THEN COALESCE(canceled_at, now())
        ELSE canceled_at
      END,
      ends_at = CASE
        WHEN next_status IN ('canceled', 'expired') THEN COALESCE(target_due_at, target_current_period_ends_at, ends_at, now())
        ELSE ends_at
      END,
      origin = COALESCE(origin, 'checkout'),
      metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(target_metadata, '{}'::jsonb)
    WHERE id = target_record.id
    RETURNING * INTO target_record;
  END IF;

  resolved_subscription_id := target_record.id;

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
  VALUES (
    target_user_id,
    resolved_subscription_id,
    target_plan_id,
    lifecycle_event,
    next_status,
    target_record.started_at,
    COALESCE(target_due_at, target_record.due_at),
    COALESCE(target_trial_starts_at, target_record.trial_starts_at),
    COALESCE(target_trial_ends_at, target_record.trial_ends_at),
    COALESCE(target_auto_renew, target_record.auto_renew),
    jsonb_build_object(
      'gateway', target_gateway,
      'external_customer_id', target_external_customer_id,
      'external_subscription_id', target_external_subscription_id,
      'external_reference', target_external_reference
    ) || COALESCE(target_metadata, '{}'::jsonb)
  );

  RETURN resolved_subscription_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_billing_checkout_session(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  UUID,
  NUMERIC,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  JSONB,
  TIMESTAMPTZ
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_billing_checkout_session(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  UUID,
  NUMERIC,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  JSONB,
  TIMESTAMPTZ
) TO authenticated;

REVOKE ALL ON FUNCTION public.register_billing_webhook_event(
  TEXT,
  TEXT,
  TEXT,
  JSONB,
  TEXT
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.upsert_billing_invoice(
  UUID,
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT,
  TEXT,
  JSONB
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.apply_billing_subscription_event(
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  NUMERIC,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  BOOLEAN,
  JSONB
) FROM PUBLIC;
