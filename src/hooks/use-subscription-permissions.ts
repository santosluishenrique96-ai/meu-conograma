import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteSubscriptionFeature,
  getCurrentUserPlanPermissionSnapshot,
  listPlanFeatureAccess,
  listSubscriptionFeatures,
  saveSubscriptionFeature,
  upsertPlanFeatureAccess,
} from "@/services/subscription-permissions";
import type { SubscriptionFeatureFormValues } from "@/types/subscriptions";

export function useAdminSubscriptionFeatures(enabled = true) {
  return useQuery({
    queryKey: ["subscription-features", "admin"],
    queryFn: () => listSubscriptionFeatures({ includeInactive: true }),
    enabled,
  });
}

export function useSubscriptionFeatures() {
  return useQuery({
    queryKey: ["subscription-features", "active"],
    queryFn: () => listSubscriptionFeatures({ includeInactive: false }),
    staleTime: 60_000,
  });
}

export function useAdminPlanFeatureAccess(enabled = true) {
  return useQuery({
    queryKey: ["plan-feature-access", "admin"],
    queryFn: listPlanFeatureAccess,
    enabled,
  });
}

export function useCurrentUserPlanPermissions(userId?: string) {
  return useQuery({
    queryKey: ["user-plan-permissions", userId],
    queryFn: () => getCurrentUserPlanPermissionSnapshot(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useSubscriptionPermissionAdminMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["subscription-features"] }),
      queryClient.invalidateQueries({ queryKey: ["plan-feature-access"] }),
      queryClient.invalidateQueries({ queryKey: ["user-plan-permissions"] }),
    ]);
  };

  const saveFeature = useMutation({
    mutationFn: ({
      feature,
      userId,
    }: {
      feature: SubscriptionFeatureFormValues;
      userId: string;
    }) => saveSubscriptionFeature(feature, userId),
    onSuccess: invalidate,
  });

  const deleteFeature = useMutation({
    mutationFn: deleteSubscriptionFeature,
    onSuccess: invalidate,
  });

  const togglePlanFeature = useMutation({
    mutationFn: ({
      planId,
      featureId,
      isEnabled,
      userId,
    }: {
      planId: string;
      featureId: string;
      isEnabled: boolean;
      userId: string;
    }) => upsertPlanFeatureAccess({ planId, featureId, isEnabled, userId }),
    onSuccess: invalidate,
  });

  return {
    saveFeature,
    deleteFeature,
    togglePlanFeature,
  };
}
