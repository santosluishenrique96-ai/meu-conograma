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
