import { supabase } from "@/integrations/supabase/client";
import { prepareBillingPortalAction, prepareCheckoutSession } from "@/services/billing-gateways";
import type {
  BillingCheckoutSessionRow,
  BillingInvoiceRow,
  PrepareBillingPortalActionInput,
  PrepareCheckoutSessionInput,
  PreparedBillingPortalAction,
  PreparedCheckoutSession,
  UserBillingSnapshot,
} from "@/types/billing";

export async function listUserBillingCheckoutSessions(userId: string) {
  const { data, error } = await supabase
    .from("billing_checkout_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as BillingCheckoutSessionRow[];
}

export async function listUserBillingInvoices(userId: string) {
  const { data, error } = await supabase
    .from("billing_invoices")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as BillingInvoiceRow[];
}

export async function getUserBillingSnapshot(userId: string) {
  const [checkoutSessions, invoices] = await Promise.all([
    listUserBillingCheckoutSessions(userId),
    listUserBillingInvoices(userId),
  ]);

  return {
    checkoutSessions,
    invoices,
  } satisfies UserBillingSnapshot;
}

export async function createBillingCheckoutSessionIntent(
  input: PrepareCheckoutSessionInput,
): Promise<PreparedCheckoutSession> {
  const preparedSession = await prepareCheckoutSession(input);

  const { data, error } = await supabase.rpc("record_billing_checkout_session", {
    target_plan_id: input.plan.id,
    target_gateway: preparedSession.gateway.key,
    target_action: input.action,
    target_billing_interval: input.billingInterval,
    target_subscription_id: input.currentSubscription?.id ?? undefined,
    target_amount_snapshot: preparedSession.priceAmount,
    target_currency_code: preparedSession.currencyCode,
    target_checkout_url: preparedSession.checkoutUrl ?? undefined,
    target_success_url: input.successUrl ?? undefined,
    target_cancel_url: input.cancelUrl ?? undefined,
    target_metadata: preparedSession.metadata,
    target_expires_at: undefined,
  });

  if (error) {
    throw error;
  }

  return {
    ...preparedSession,
    id: (data as string | null) ?? undefined,
  };
}

export async function createBillingPortalActionIntent(
  input: PrepareBillingPortalActionInput,
): Promise<PreparedBillingPortalAction> {
  return prepareBillingPortalAction(input);
}
