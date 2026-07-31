import { supabase } from "@/integrations/supabase/client";
import {
  CURRENT_USER_SUBSCRIPTION_STATUSES,
} from "@/types/subscriptions";
import type {
  SubscriptionPlanRow,
  UserSubscriptionHistoryRow,
  UserSubscriptionRow,
  UserSubscriptionSnapshot,
  UserSubscriptionStateRow,
} from "@/types/subscriptions";

async function resolveCurrentSubscriptionRecord(userId: string, state?: UserSubscriptionStateRow | null) {
  const currentSubscriptionId = state?.current_subscription_id ?? null;

  if (currentSubscriptionId) {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("id", currentSubscriptionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data as UserSubscriptionRow;
    }
  }

  const { data: prioritized, error: prioritizedError } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .in("status", [...CURRENT_USER_SUBSCRIPTION_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prioritizedError) {
    throw prioritizedError;
  }

  if (prioritized) {
    return prioritized as UserSubscriptionRow;
  }

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

  return (data as UserSubscriptionRow | null) ?? null;
}

export async function getUserSubscriptionState(userId: string) {
  const { data, error } = await supabase
    .from("user_subscription_state")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as UserSubscriptionStateRow | null) ?? null;
}

export async function getUserSubscriptionHistory(userId: string) {
  const { data, error } = await supabase
    .from("user_subscription_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as UserSubscriptionHistoryRow[];
}

export async function getCurrentUserSubscriptionRecord(userId: string) {
  return resolveCurrentSubscriptionRecord(userId);
}

export async function getUserSubscriptionSnapshot(userId: string) {
  const [state, history] = await Promise.all([
    getUserSubscriptionState(userId),
    getUserSubscriptionHistory(userId),
  ]);
  const currentSubscription = await resolveCurrentSubscriptionRecord(userId, state);

  let currentPlan: SubscriptionPlanRow | null = null;
  const currentPlanId = state?.current_plan_id ?? currentSubscription?.plan_id ?? null;

  if (currentPlanId) {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", currentPlanId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    currentPlan = (data as SubscriptionPlanRow | null) ?? null;
  }

  return {
    currentPlan,
    currentSubscription,
    state,
    history,
  } satisfies UserSubscriptionSnapshot;
}

export async function ensureCurrentUserSubscriptionProvisioned() {
  const { data, error } = await supabase.rpc("provision_current_user_subscription");

  if (error) {
    throw error;
  }

  return data as string | null;
}
