import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ensureCurrentUserSubscriptionProvisioned,
  getCurrentUserSubscriptionRecord,
  getUserSubscriptionHistory,
  getUserSubscriptionSnapshot,
  getUserSubscriptionState,
} from "@/services/user-subscriptions";

export function useUserSubscriptionState(userId?: string) {
  return useQuery({
    queryKey: ["user-subscription-state", userId],
    queryFn: () => getUserSubscriptionState(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useUserSubscriptionHistory(userId?: string) {
  return useQuery({
    queryKey: ["user-subscription-history", userId],
    queryFn: () => getUserSubscriptionHistory(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useCurrentUserSubscriptionRecord(userId?: string) {
  return useQuery({
    queryKey: ["user-subscription-record", userId],
    queryFn: () => getCurrentUserSubscriptionRecord(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useUserSubscriptionSnapshot(userId?: string) {
  return useQuery({
    queryKey: ["user-subscription-snapshot", userId],
    queryFn: () => getUserSubscriptionSnapshot(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useProvisionUserSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ensureCurrentUserSubscriptionProvisioned,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-subscription"] }),
        queryClient.invalidateQueries({ queryKey: ["user-subscription-state"] }),
        queryClient.invalidateQueries({ queryKey: ["user-subscription-history"] }),
        queryClient.invalidateQueries({ queryKey: ["user-subscription-record"] }),
        queryClient.invalidateQueries({ queryKey: ["user-subscription-snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["subscription-financial-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["billing-checkout-sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["billing-invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["billing-snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["user-plan-permissions"] }),
      ]);
    },
  });
}
