import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBillingCheckoutSessionIntent,
  createBillingPortalActionIntent,
  getUserBillingSnapshot,
  listUserBillingCheckoutSessions,
  listUserBillingInvoices,
} from "@/services/billing-orchestration";

export function useUserBillingCheckoutSessions(userId?: string) {
  return useQuery({
    queryKey: ["billing-checkout-sessions", userId],
    queryFn: () => listUserBillingCheckoutSessions(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useUserBillingInvoices(userId?: string) {
  return useQuery({
    queryKey: ["billing-invoices", userId],
    queryFn: () => listUserBillingInvoices(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useUserBillingSnapshot(userId?: string) {
  return useQuery({
    queryKey: ["billing-snapshot", userId],
    queryFn: () => getUserBillingSnapshot(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useCreateBillingCheckoutSessionIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBillingCheckoutSessionIntent,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billing-checkout-sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["billing-snapshot"] }),
      ]);
    },
  });
}

export function useCreateBillingPortalActionIntent() {
  return useMutation({
    mutationFn: createBillingPortalActionIntent,
  });
}
