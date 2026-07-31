import { useMutation, useQuery } from "@tanstack/react-query";
import {
  listBillingGatewayDefinitions,
  prepareBillingPortalAction,
  prepareCheckoutSession,
} from "@/services/billing-gateways";

export function useBillingGateways() {
  return useQuery({
    queryKey: ["billing-gateways"],
    queryFn: async () => listBillingGatewayDefinitions(),
    staleTime: Infinity,
  });
}

export function usePrepareCheckoutSession() {
  return useMutation({
    mutationFn: prepareCheckoutSession,
  });
}

export function usePrepareBillingPortalAction() {
  return useMutation({
    mutationFn: prepareBillingPortalAction,
  });
}
