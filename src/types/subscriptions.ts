import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type SubscriptionPlanRow = Tables<"subscription_plans">;
export type SubscriptionPlanInsert = TablesInsert<"subscription_plans">;
export type SubscriptionPlanUpdate = TablesUpdate<"subscription_plans">;
export type UserSubscriptionRow = Tables<"user_subscriptions">;

export const SUBSCRIPTION_PLAN_ICON_OPTIONS = [
  "sparkles",
  "shield-check",
  "crown",
  "star",
  "gem",
  "calendar",
  "heart",
  "wand-2",
] as const;

export type SubscriptionPlanIcon = (typeof SUBSCRIPTION_PLAN_ICON_OPTIONS)[number];

export const SUBSCRIPTION_BILLING_INTERVALS = ["monthly", "annual"] as const;
export type SubscriptionBillingInterval = (typeof SUBSCRIPTION_BILLING_INTERVALS)[number];

export const USER_SUBSCRIPTION_STATUSES = [
  "draft",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
  "incomplete",
] as const;

export type UserSubscriptionStatus = (typeof USER_SUBSCRIPTION_STATUSES)[number];

export type SubscriptionPlanFormValues = {
  id?: string;
  name: string;
  description: string;
  monthly_price: number;
  annual_price: number;
  promotional_price: number | null;
  free_trial_days: number;
  color: string;
  icon: SubscriptionPlanIcon;
  button_text: string;
  badge: string;
  display_order: number;
  is_active: boolean;
};

export const EMPTY_SUBSCRIPTION_PLAN_FORM: SubscriptionPlanFormValues = {
  name: "",
  description: "",
  monthly_price: 0,
  annual_price: 0,
  promotional_price: null,
  free_trial_days: 0,
  color: "#8B5CF6",
  icon: "sparkles",
  button_text: "Escolher plano",
  badge: "",
  display_order: 1,
  is_active: true,
};
