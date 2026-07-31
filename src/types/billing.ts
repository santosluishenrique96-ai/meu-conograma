import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type {
  SubscriptionBillingInterval,
  SubscriptionPlanCatalogItem,
  SubscriptionPlanRow,
  UserSubscriptionRow,
} from "@/types/subscriptions";

export type BillingCheckoutSessionRow = Tables<"billing_checkout_sessions">;
export type BillingCheckoutSessionInsert = TablesInsert<"billing_checkout_sessions">;
export type BillingCheckoutSessionUpdate = TablesUpdate<"billing_checkout_sessions">;
export type BillingInvoiceRow = Tables<"billing_invoices">;
export type BillingInvoiceInsert = TablesInsert<"billing_invoices">;
export type BillingWebhookEventRow = Tables<"billing_webhook_events">;

export const BILLING_GATEWAY_KEYS = [
  "stripe",
  "mercado-pago",
  "asaas",
  "pagseguro",
  "kirvano",
  "kiwify",
  "hotmart",
  "eduzz",
  "monetizze",
] as const;

export type BillingGatewayKey = (typeof BILLING_GATEWAY_KEYS)[number];

export const BILLING_GATEWAY_CAPABILITIES = [
  "checkout",
  "customer-portal",
  "subscription-upgrade",
  "subscription-downgrade",
  "subscription-cancel",
  "subscription-reactivate",
  "webhook-sync",
] as const;

export type BillingGatewayCapability = (typeof BILLING_GATEWAY_CAPABILITIES)[number];

export const BILLING_CHECKOUT_SESSION_STATUSES = [
  "draft",
  "pending",
  "completed",
  "expired",
  "canceled",
  "failed",
] as const;

export type BillingCheckoutSessionStatus =
  (typeof BILLING_CHECKOUT_SESSION_STATUSES)[number];

export const BILLING_INVOICE_STATUSES = [
  "draft",
  "open",
  "paid",
  "past_due",
  "void",
  "uncollectible",
  "refunded",
  "failed",
] as const;

export type BillingInvoiceStatus = (typeof BILLING_INVOICE_STATUSES)[number];

export const BILLING_ACTION_TYPES = [
  "subscribe",
  "upgrade",
  "downgrade",
  "cancel",
  "reactivate",
  "manage-billing",
] as const;

export type BillingActionType = (typeof BILLING_ACTION_TYPES)[number];

export type BillingGatewayDefinition = {
  key: BillingGatewayKey;
  name: string;
  marketingSite: string;
  description: string;
  supportedCountries: string[];
  capabilities: BillingGatewayCapability[];
  defaultCurrency: string;
  statusLabel: string;
};

export type BillingPlanReference = Pick<
  SubscriptionPlanRow,
  | "id"
  | "slug"
  | "name"
  | "monthly_price"
  | "annual_price"
  | "promotional_price"
  | "free_trial_days"
  | "button_text"
> &
  Partial<Pick<SubscriptionPlanCatalogItem, "benefits">>;

export type BillingCustomerContext = {
  userId: string;
  email: string | null;
  displayName: string | null;
};

export type BillingSubscriptionContext = Pick<
  UserSubscriptionRow,
  | "id"
  | "plan_id"
  | "status"
  | "billing_interval"
  | "provider"
  | "provider_customer_id"
  | "provider_subscription_id"
> | null;

export type PrepareCheckoutSessionInput = {
  gateway?: BillingGatewayKey;
  action: Extract<BillingActionType, "subscribe" | "upgrade" | "downgrade" | "reactivate">;
  billingInterval: SubscriptionBillingInterval;
  plan: BillingPlanReference;
  customer: BillingCustomerContext;
  currentSubscription?: BillingSubscriptionContext;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type PreparedCheckoutSession = {
  id?: string;
  gateway: BillingGatewayDefinition;
  action: PrepareCheckoutSessionInput["action"];
  planId: string;
  checkoutMode: "hosted" | "embedded" | "redirect";
  checkoutUrl: string | null;
  priceAmount: number;
  currencyCode: string;
  metadata: Record<string, string | number | boolean | null>;
  message: string;
  isLive: boolean;
};

export type PrepareBillingPortalActionInput = {
  gateway?: BillingGatewayKey;
  action: Extract<BillingActionType, "cancel" | "manage-billing">;
  customer: BillingCustomerContext;
  currentSubscription: BillingSubscriptionContext;
  returnUrl?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type PreparedBillingPortalAction = {
  gateway: BillingGatewayDefinition;
  action: PrepareBillingPortalActionInput["action"];
  portalUrl: string | null;
  message: string;
  isLive: boolean;
  metadata: Record<string, string | number | boolean | null>;
};

export type UserBillingSnapshot = {
  checkoutSessions: BillingCheckoutSessionRow[];
  invoices: BillingInvoiceRow[];
};

export interface BillingGatewayAdapter {
  definition: BillingGatewayDefinition;
  prepareCheckoutSession(input: PrepareCheckoutSessionInput): Promise<PreparedCheckoutSession>;
  prepareBillingPortalAction(
    input: PrepareBillingPortalActionInput,
  ): Promise<PreparedBillingPortalAction>;
}
