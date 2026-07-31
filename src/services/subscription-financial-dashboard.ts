import { supabase } from "@/integrations/supabase/client";
import type {
  SubscriptionFinancialDashboard,
  SubscriptionFinancialPlanBreakdown,
  SubscriptionFinancialStatusBreakdown,
  SubscriptionFinancialTrendPoint,
  SubscriptionPlanRow,
  UserSubscriptionRow,
  UserSubscriptionStateRow,
  UserSubscriptionStatus,
} from "@/types/subscriptions";

const PAID_STATUSES = new Set<UserSubscriptionStatus>(["active", "past_due"]);
const CANCELED_STATUSES = new Set<UserSubscriptionStatus>(["canceled", "expired"]);

const statusLabels: Record<UserSubscriptionStatus, string> = {
  draft: "Rascunho",
  trialing: "Teste gratis",
  active: "Ativa",
  past_due: "Pagamento pendente",
  canceled: "Cancelada",
  expired: "Expirada",
  incomplete: "Incompleta",
};

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = Number(value);
    if (Number.isFinite(normalized)) {
      return normalized;
    }
  }

  return null;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
}

function getMonthBuckets(totalMonths = 6) {
  const now = new Date();
  const months: Array<{ monthKey: string; monthLabel: string }> = [];

  for (let offset = totalMonths - 1; offset >= 0; offset -= 1) {
    const current = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({
      monthKey: getMonthKey(current),
      monthLabel: getMonthLabel(current),
    });
  }

  return months;
}

function getEffectiveSubscriptionValue(
  plan: SubscriptionPlanRow,
  subscription: UserSubscriptionRow | null | undefined,
) {
  const billingInterval = subscription?.billing_interval ?? "monthly";
  const priceSnapshot = parseNumber(subscription?.price_snapshot);

  if (priceSnapshot !== null) {
    return {
      billingInterval,
      billedAmount: priceSnapshot,
    };
  }

  if (billingInterval === "annual") {
    return {
      billingInterval,
      billedAmount: plan.annual_price,
    };
  }

  return {
    billingInterval,
    billedAmount: plan.promotional_price ?? plan.monthly_price,
  };
}

function getRecurringRevenue(
  plan: SubscriptionPlanRow,
  subscription: UserSubscriptionRow | null | undefined,
) {
  const { billingInterval, billedAmount } = getEffectiveSubscriptionValue(plan, subscription);
  const monthly = billingInterval === "annual" ? billedAmount / 12 : billedAmount;

  return {
    monthly: roundCurrency(monthly),
    annual: roundCurrency(monthly * 12),
  };
}

function isActiveTrial(state: UserSubscriptionStateRow) {
  if (state.status !== "trialing") return false;
  if (!state.trial_ends_at) return true;

  return new Date(state.trial_ends_at).getTime() >= Date.now();
}

export async function getSubscriptionFinancialDashboard() {
  const monthBuckets = getMonthBuckets(6);
  const firstMonthDate = new Date();
  firstMonthDate.setMonth(firstMonthDate.getMonth() - (monthBuckets.length - 1));
  firstMonthDate.setDate(1);
  firstMonthDate.setHours(0, 0, 0, 0);

  const [plansResult, statesResult, historyResult] = await Promise.all([
    supabase
      .from("subscription_plans")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("user_subscription_state").select("*"),
    supabase
      .from("user_subscription_history")
      .select("*")
      .gte("created_at", firstMonthDate.toISOString())
      .order("created_at", { ascending: true }),
  ]);

  if (plansResult.error) throw plansResult.error;
  if (statesResult.error) throw statesResult.error;
  if (historyResult.error) throw historyResult.error;

  const plans = (plansResult.data ?? []) as SubscriptionPlanRow[];
  const states = (statesResult.data ?? []) as UserSubscriptionStateRow[];
  const history = historyResult.data ?? [];

  const currentSubscriptionIds = [...new Set(
    states.map((state) => state.current_subscription_id).filter(Boolean),
  )] as string[];

  const subscriptionsResult = currentSubscriptionIds.length
    ? await supabase
        .from("user_subscriptions")
        .select("*")
        .in("id", currentSubscriptionIds)
    : { data: [], error: null };

  if (subscriptionsResult.error) throw subscriptionsResult.error;

  const subscriptions = (subscriptionsResult.data ?? []) as UserSubscriptionRow[];
  const subscriptionMap = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
  const planMap = new Map(plans.map((plan) => [plan.id, plan]));

  const planBreakdownMap = new Map<string, SubscriptionFinancialPlanBreakdown>(
    plans.map((plan) => [
      plan.id,
      {
        planId: plan.id,
        planName: plan.name,
        planSlug: plan.slug,
        color: plan.color,
        subscribers: 0,
        payingSubscribers: 0,
        trialSubscribers: 0,
        monthlyRecurringRevenue: 0,
        annualRecurringRevenue: 0,
      },
    ]),
  );

  const statusCountMap = new Map<UserSubscriptionStatus, number>(
    (Object.keys(statusLabels) as UserSubscriptionStatus[]).map((status) => [status, 0]),
  );

  let monthlyRecurringRevenue = 0;
  let renewalsCount = 0;
  let conversionsCount = 0;
  let cancellationsCount = 0;
  let activeTrialsCount = 0;
  let paidSubscribers = 0;

  for (const state of states) {
    const status = state.status as UserSubscriptionStatus;
    statusCountMap.set(status, (statusCountMap.get(status) ?? 0) + 1);
    renewalsCount += Math.max(0, state.renewal_count ?? 0);

    if (CANCELED_STATUSES.has(status)) {
      cancellationsCount += 1;
    }

    if (isActiveTrial(state)) {
      activeTrialsCount += 1;
    }

    const plan = state.current_plan_id ? planMap.get(state.current_plan_id) : null;
    if (!plan) continue;

    const currentPlan = planBreakdownMap.get(plan.id);
    if (!currentPlan) continue;

    currentPlan.subscribers += 1;

    if (status === "trialing") {
      currentPlan.trialSubscribers += 1;
    }

    const subscription = state.current_subscription_id
      ? subscriptionMap.get(state.current_subscription_id)
      : null;

    if (state.trial_used && PAID_STATUSES.has(status)) {
      conversionsCount += 1;
    }

    if (PAID_STATUSES.has(status)) {
      const recurring = getRecurringRevenue(plan, subscription);
      currentPlan.payingSubscribers += 1;
      currentPlan.monthlyRecurringRevenue += recurring.monthly;
      currentPlan.annualRecurringRevenue += recurring.annual;
      monthlyRecurringRevenue += recurring.monthly;
      paidSubscribers += 1;
    }
  }

  type MutableGrowthBucket = SubscriptionFinancialTrendPoint & {
    createdKeys: Set<string>;
    conversionKeys: Set<string>;
    cancellationKeys: Set<string>;
  };

  const growthMap = new Map<string, MutableGrowthBucket>(
    monthBuckets.map(({ monthKey, monthLabel }) => [
      monthKey,
      {
        monthKey,
        monthLabel,
        newSubscriptions: 0,
        conversions: 0,
        cancellations: 0,
        createdKeys: new Set<string>(),
        conversionKeys: new Set<string>(),
        cancellationKeys: new Set<string>(),
      },
    ]),
  );

  for (const item of history) {
    const createdAt = new Date(item.created_at);
    const bucket = growthMap.get(getMonthKey(createdAt));
    if (!bucket) continue;

    const uniqueKey = item.subscription_id ?? `${item.user_id}:${item.plan_id ?? "sem-plano"}`;
    const status = item.status as UserSubscriptionStatus;
    const payload =
      item.payload && typeof item.payload === "object"
        ? (item.payload as Record<string, unknown>)
        : {};
    const plan = item.plan_id ? planMap.get(item.plan_id) : null;
    const billingInterval =
      typeof payload.billing_interval === "string" ? payload.billing_interval : "monthly";
    const priceSnapshot = parseNumber(payload.price_snapshot);
    const inferredPaidValue =
      priceSnapshot ??
      (billingInterval === "annual" ? (plan?.annual_price ?? 0) : (plan?.promotional_price ?? plan?.monthly_price ?? 0));

    if (item.event_type === "subscription_created" && !bucket.createdKeys.has(uniqueKey)) {
      bucket.createdKeys.add(uniqueKey);
      bucket.newSubscriptions += 1;
    }

    if (
      PAID_STATUSES.has(status) &&
      inferredPaidValue > 0 &&
      !bucket.conversionKeys.has(uniqueKey)
    ) {
      bucket.conversionKeys.add(uniqueKey);
      bucket.conversions += 1;
    }

    if (CANCELED_STATUSES.has(status) && !bucket.cancellationKeys.has(uniqueKey)) {
      bucket.cancellationKeys.add(uniqueKey);
      bucket.cancellations += 1;
    }
  }

  const planBreakdown = [...planBreakdownMap.values()]
    .map((plan) => ({
      ...plan,
      monthlyRecurringRevenue: roundCurrency(plan.monthlyRecurringRevenue),
      annualRecurringRevenue: roundCurrency(plan.annualRecurringRevenue),
    }))
    .sort((left, right) => {
      const leftPlan = plans.find((plan) => plan.id === left.planId);
      const rightPlan = plans.find((plan) => plan.id === right.planId);
      return (leftPlan?.display_order ?? 0) - (rightPlan?.display_order ?? 0);
    });

  const statusBreakdown: SubscriptionFinancialStatusBreakdown[] = (
    Object.keys(statusLabels) as UserSubscriptionStatus[]
  ).map((status) => ({
    status,
    label: statusLabels[status],
    count: statusCountMap.get(status) ?? 0,
  }));

  return {
    generatedAt: new Date().toISOString(),
    monthlyRecurringRevenue: roundCurrency(monthlyRecurringRevenue),
    annualRecurringRevenue: roundCurrency(monthlyRecurringRevenue * 12),
    subscriberCount: states.length,
    freePlanSubscribers: planBreakdown.find((plan) => plan.planSlug === "gratuito")?.subscribers ?? 0,
    essentialPlanSubscribers:
      planBreakdown.find((plan) => plan.planSlug === "essencial")?.subscribers ?? 0,
    premiumPlanSubscribers: planBreakdown.find((plan) => plan.planSlug === "premium")?.subscribers ?? 0,
    cancellationsCount,
    renewalsCount,
    conversionsCount,
    activeTrialsCount,
    averageTicket: paidSubscribers > 0 ? roundCurrency(monthlyRecurringRevenue / paidSubscribers) : 0,
    planBreakdown,
    growthSeries: monthBuckets.map(({ monthKey }) => {
      const bucket = growthMap.get(monthKey);
      if (!bucket) {
        return {
          monthKey,
          monthLabel: monthKey,
          newSubscriptions: 0,
          conversions: 0,
          cancellations: 0,
        };
      }

      return {
        monthKey: bucket.monthKey,
        monthLabel: bucket.monthLabel,
        newSubscriptions: bucket.newSubscriptions,
        conversions: bucket.conversions,
        cancellations: bucket.cancellations,
      };
    }),
    statusBreakdown,
  } satisfies SubscriptionFinancialDashboard;
}
