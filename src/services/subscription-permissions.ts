import { supabase } from "@/integrations/supabase/client";
import type {
  PlanFeatureAccessMap,
  PlanFeatureAccessRow,
  SubscriptionFeatureFormValues,
  SubscriptionFeatureInsert,
  SubscriptionFeatureRow,
  SubscriptionPlanRow,
} from "@/types/subscriptions";

function slugifyFeatureKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function normalizeFeaturePayload(
  feature: SubscriptionFeatureFormValues,
  userId: string,
): SubscriptionFeatureInsert {
  const payload: SubscriptionFeatureInsert = {
    id: feature.id,
    feature_key: slugifyFeatureKey(feature.feature_key || feature.name),
    name: feature.name.trim(),
    description: feature.description.trim(),
    category: feature.category.trim() || "Geral",
    display_order: Math.max(0, Math.trunc(feature.display_order)),
    is_active: feature.is_active,
    updated_by: userId,
  };

  if (!feature.id) {
    payload.created_by = userId;
  }

  return payload;
}

export async function listSubscriptionFeatures(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;

  let query = supabase
    .from("subscription_features")
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

  return (data ?? []) as SubscriptionFeatureRow[];
}

export async function saveSubscriptionFeature(
  feature: SubscriptionFeatureFormValues,
  userId: string,
) {
  const payload = normalizeFeaturePayload(feature, userId);
  const { data, error } = await supabase
    .from("subscription_features")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as SubscriptionFeatureRow;
}

export async function deleteSubscriptionFeature(featureId: string) {
  const { error } = await supabase.from("subscription_features").delete().eq("id", featureId);

  if (error) {
    throw error;
  }
}

export async function listPlanFeatureAccess() {
  const { data, error } = await supabase
    .from("plan_feature_access")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as PlanFeatureAccessRow[];
}

export async function upsertPlanFeatureAccess({
  planId,
  featureId,
  isEnabled,
  userId,
}: {
  planId: string;
  featureId: string;
  isEnabled: boolean;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("plan_feature_access")
    .upsert(
      {
        plan_id: planId,
        feature_id: featureId,
        is_enabled: isEnabled,
        updated_by: userId,
        created_by: userId,
      },
      { onConflict: "plan_id,feature_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as PlanFeatureAccessRow;
}

export function buildPlanFeatureAccessMap(accessRows: PlanFeatureAccessRow[]) {
  return accessRows.reduce<PlanFeatureAccessMap>((accumulator, row) => {
    if (!accumulator[row.plan_id]) {
      accumulator[row.plan_id] = {};
    }

    accumulator[row.plan_id][row.feature_id] = row.is_enabled;
    return accumulator;
  }, {});
}

export async function getPlanEnabledFeatureKeys(planId: string) {
  const { data: accessRows, error: accessError } = await supabase
    .from("plan_feature_access")
    .select("feature_id")
    .eq("plan_id", planId)
    .eq("is_enabled", true);

  if (accessError) {
    throw accessError;
  }

  const featureIds = (accessRows ?? []).map((row) => row.feature_id);
  if (!featureIds.length) return [];

  const { data: features, error: featureError } = await supabase
    .from("subscription_features")
    .select("feature_key")
    .in("id", featureIds)
    .eq("is_active", true);

  if (featureError) {
    throw featureError;
  }

  return (features ?? []).map((feature) => feature.feature_key);
}

export async function getCurrentUserPlanPermissionSnapshot(userId: string) {
  const { data: state, error: stateError } = await supabase
    .from("user_subscription_state")
    .select("current_plan_id, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (stateError) {
    throw stateError;
  }

  let plan: SubscriptionPlanRow | null = null;

  if (state?.current_plan_id) {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", state.current_plan_id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    plan = (data as SubscriptionPlanRow | null) ?? null;
  }

  if (!plan) {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("slug", "gratuito")
      .maybeSingle();

    if (error) {
      throw error;
    }

    plan = (data as SubscriptionPlanRow | null) ?? null;
  }

  const enabledFeatureKeys = plan ? await getPlanEnabledFeatureKeys(plan.id) : [];

  return {
    plan,
    enabledFeatureKeys,
    featureFlags: enabledFeatureKeys.reduce<Record<string, boolean>>((accumulator, key) => {
      accumulator[key] = true;
      return accumulator;
    }, {}),
  };
}
