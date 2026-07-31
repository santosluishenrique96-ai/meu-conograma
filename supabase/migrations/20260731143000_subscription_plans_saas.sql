CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  annual_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  promotional_price NUMERIC(10, 2),
  free_trial_days INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  icon TEXT NOT NULL DEFAULT 'sparkles',
  button_text TEXT NOT NULL DEFAULT 'Escolher plano',
  badge TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscription_plans_monthly_price_check CHECK (monthly_price >= 0),
  CONSTRAINT subscription_plans_annual_price_check CHECK (annual_price >= 0),
  CONSTRAINT subscription_plans_promotional_price_check CHECK (
    promotional_price IS NULL OR promotional_price >= 0
  ),
  CONSTRAINT subscription_plans_trial_days_check CHECK (free_trial_days >= 0)
);

CREATE INDEX idx_subscription_plans_order
ON public.subscription_plans (display_order, created_at);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subscription plans public read active"
ON public.subscription_plans
FOR SELECT
USING (is_active OR public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins can insert subscription plans"
ON public.subscription_plans
FOR INSERT
WITH CHECK (public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins can update subscription plans"
ON public.subscription_plans
FOR UPDATE
USING (public.is_store_admin(auth.uid()))
WITH CHECK (public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins can delete subscription plans"
ON public.subscription_plans
FOR DELETE
USING (public.is_store_admin(auth.uid()));

GRANT SELECT ON TABLE public.subscription_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subscription_plans TO authenticated;

CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft',
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  price_snapshot NUMERIC(10, 2),
  currency_code TEXT NOT NULL DEFAULT 'BRL',
  trial_starts_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  current_period_starts_at TIMESTAMPTZ,
  current_period_ends_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  external_reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_subscriptions_status_check CHECK (
    status IN ('draft', 'trialing', 'active', 'past_due', 'canceled', 'expired', 'incomplete')
  ),
  CONSTRAINT user_subscriptions_billing_interval_check CHECK (
    billing_interval IN ('monthly', 'annual')
  ),
  CONSTRAINT user_subscriptions_price_snapshot_check CHECK (
    price_snapshot IS NULL OR price_snapshot >= 0
  )
);

CREATE INDEX idx_user_subscriptions_user
ON public.user_subscriptions (user_id, created_at DESC);

CREATE INDEX idx_user_subscriptions_plan
ON public.user_subscriptions (plan_id, created_at DESC);

CREATE UNIQUE INDEX idx_user_subscriptions_single_open
ON public.user_subscriptions (user_id)
WHERE status IN ('trialing', 'active', 'past_due', 'incomplete');

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscriptions"
ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id OR public.is_store_admin(auth.uid()));

CREATE POLICY "Users create own subscriptions"
ON public.user_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_store_admin(auth.uid()));

CREATE POLICY "Users update own subscriptions"
ON public.user_subscriptions
FOR UPDATE
USING (auth.uid() = user_id OR public.is_store_admin(auth.uid()))
WITH CHECK (auth.uid() = user_id OR public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins can delete subscriptions"
ON public.user_subscriptions
FOR DELETE
USING (public.is_store_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE ON TABLE public.user_subscriptions TO authenticated;
GRANT DELETE ON TABLE public.user_subscriptions TO authenticated;

CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.subscription_plans (
  slug,
  name,
  description,
  monthly_price,
  annual_price,
  promotional_price,
  free_trial_days,
  color,
  icon,
  button_text,
  badge,
  display_order,
  is_active
)
VALUES
  (
    'gratuito',
    'Gratuito',
    'Acesso inicial ao cronograma com recursos essenciais para começar.',
    0,
    0,
    NULL,
    0,
    '#64748B',
    'sparkles',
    'Começar grátis',
    'Livre',
    1,
    true
  ),
  (
    'essencial',
    'Essencial',
    'Plano ideal para quem quer evoluir a rotina capilar com mais praticidade.',
    19.90,
    190.80,
    14.90,
    7,
    '#0EA5E9',
    'shield-check',
    'Escolher Essencial',
    'Mais vendido',
    2,
    true
  ),
  (
    'premium',
    'Premium',
    'Experiência completa para uma jornada capilar premium e profissional.',
    39.90,
    382.80,
    29.90,
    7,
    '#8B5CF6',
    'crown',
    'Assinar Premium',
    'Top',
    3,
    true
  )
ON CONFLICT (slug) DO NOTHING;
