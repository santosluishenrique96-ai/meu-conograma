import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteSubscriptionPlan,
  getCurrentUserSubscription,
  listSubscriptionPlans,
  listPublicPlanCatalog,
  saveSubscriptionPlan,
  updateSubscriptionPlanOrder,
  updateSubscriptionPlanStatus,
} from "@/services/subscription-plans";
import type { SubscriptionPlanFormValues } from "@/types/subscriptions";

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans", "active"],
    queryFn: () => listSubscriptionPlans({ includeInactive: false }),
    staleTime: 60_000,
  });
}

export function useAdminSubscriptionPlans(enabled = true) {
  return useQuery({
    queryKey: ["subscription-plans", "admin"],
    queryFn: () => listSubscriptionPlans({ includeInactive: true }),
    enabled,
  });
}

export function usePublicPlanCatalog() {
  return useQuery({
    queryKey: ["subscription-plans", "catalog"],
    queryFn: listPublicPlanCatalog,
    staleTime: 60_000,
  });
}

export function useCurrentUserSubscription(userId?: string) {
  return useQuery({
    queryKey: ["user-subscription", userId],
    queryFn: () => getCurrentUserSubscription(userId!),
    enabled: Boolean(userId),
  });
}

export function useSubscriptionPlanAdminMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] }),
      queryClient.invalidateQueries({ queryKey: ["user-subscription"] }),
      queryClient.invalidateQueries({ queryKey: ["plan-feature-access"] }),
      queryClient.invalidateQueries({ queryKey: ["user-plan-permissions"] }),
    ]);
  };

  const savePlan = useMutation({
    mutationFn: ({ plan, userId }: { plan: SubscriptionPlanFormValues; userId: string }) =>
      saveSubscriptionPlan(plan, userId),
    onSuccess: invalidate,
  });

  const deletePlan = useMutation({
    mutationFn: deleteSubscriptionPlan,
    onSuccess: invalidate,
  });

  const togglePlanStatus = useMutation({
    mutationFn: ({ planId, isActive, userId }: { planId: string; isActive: boolean; userId: string }) =>
      updateSubscriptionPlanStatus(planId, isActive, userId),
    onSuccess: invalidate,
  });

  const updatePlanOrder = useMutation({
    mutationFn: ({
      planId,
      displayOrder,
      userId,
    }: {
      planId: string;
      displayOrder: number;
      userId: string;
    }) => updateSubscriptionPlanOrder(planId, displayOrder, userId),
    onSuccess: invalidate,
  });

  return {
    savePlan,
    deletePlan,
    togglePlanStatus,
    updatePlanOrder,
  };
}
