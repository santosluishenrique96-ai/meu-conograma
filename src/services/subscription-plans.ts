import { supabase } from "@/integrations/supabase/client";
import type {
  SubscriptionPlanCatalogItem,
  SubscriptionPlanFormValues,
  SubscriptionPlanInsert,
  SubscriptionPlanRow,
  UserSubscriptionRow,
} from "@/types/subscriptions";

function slugifyPlanName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function normalizeMoney(value: number | null) {
  if (value === null || Number.isNaN(value)) return null;
  return Number(value.toFixed(2));
}

function normalizePlanPayload(plan: SubscriptionPlanFormValues, userId: string): SubscriptionPlanInsert {
  const payload: SubscriptionPlanInsert = {
    id: plan.id,
    slug: slugifyPlanName(plan.name),
    name: plan.name.trim(),
    description: plan.description.trim(),
    monthly_price: normalizeMoney(plan.monthly_price) ?? 0,
    annual_price: normalizeMoney(plan.annual_price) ?? 0,
    promotional_price: normalizeMoney(plan.promotional_price),
    free_trial_days: Math.max(0, Math.trunc(plan.free_trial_days)),
    color: plan.color.trim() || "#8B5CF6",
    icon: plan.icon,
    button_text: plan.button_text.trim() || "Escolher plano",
    badge: plan.badge.trim() || null,
    display_order: Math.max(0, Math.trunc(plan.display_order)),
    is_active: plan.is_active,
    updated_by: userId,
  };

  if (!plan.id) {
    payload.created_by = userId;
  }

  return payload;
}

export async function listSubscriptionPlans(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;

  let query = supabase
    .from("subscription_plans")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as SubscriptionPlanRow[];
}

export async function saveSubscriptionPlan(plan: SubscriptionPlanFormValues, userId: string) {
  const payload = normalizePlanPayload(plan, userId);
  const { data, error } = await supabase
    .from("subscription_plans")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as SubscriptionPlanRow;
}

export async function deleteSubscriptionPlan(planId: string) {
  const { error } = await supabase.from("subscription_plans").delete().eq("id", planId);
  if (error) {
    throw error;
  }
}

export async function updateSubscriptionPlanStatus(
  planId: string,
  isActive: boolean,
  userId: string,
) {
  const { data, error } = await supabase
    .from("subscription_plans")
    .update({ is_active: isActive, updated_by: userId })
    .eq("id", planId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as SubscriptionPlanRow;
}

export async function updateSubscriptionPlanOrder(
  planId: string,
  displayOrder: number,
  userId: string,
) {
  const { data, error } = await supabase
    .from("subscription_plans")
    .update({ display_order: Math.max(0, Math.trunc(displayOrder)), updated_by: userId })
    .eq("id", planId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as SubscriptionPlanRow;
}

export async function getCurrentUserSubscription(userId: string) {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as UserSubscriptionRow | null;
}

export async function listPublicPlanCatalog() {
  const { data: plans, error: plansError } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (plansError) {
    throw plansError;
  }

  const activePlans = (plans ?? []) as SubscriptionPlanRow[];
  if (!activePlans.length) return [] as SubscriptionPlanCatalogItem[];

  const planIds = activePlans.map((plan) => plan.id);

  const { data: featureAccessRows, error: featureAccessError } = await supabase
    .from("plan_feature_access")
    .select("plan_id, feature_id, is_enabled")
    .in("plan_id", planIds)
    .eq("is_enabled", true);

  if (featureAccessError) {
    throw featureAccessError;
  }

  const featureIds = [...new Set((featureAccessRows ?? []).map((row) => row.feature_id))];

  const { data: features, error: featuresError } = featureIds.length
    ? await supabase
        .from("subscription_features")
        .select("id, name, description, category, display_order, is_active")
        .in("id", featureIds)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
    : { data: [], error: null };

  if (featuresError) {
    throw featuresError;
  }

  const featureMap = new Map(
    (features ?? []).map((feature) => [
      feature.id,
      {
        id: feature.id,
        name: feature.name,
        description: feature.description,
        category: feature.category,
      },
    ]),
  );

  return activePlans.map<SubscriptionPlanCatalogItem>((plan) => ({
    ...plan,
    benefits: (featureAccessRows ?? [])
      .filter((row) => row.plan_id === plan.id && row.is_enabled)
      .map((row) => featureMap.get(row.feature_id))
      .filter((benefit): benefit is NonNullable<typeof benefit> => Boolean(benefit)),
  }));
}
