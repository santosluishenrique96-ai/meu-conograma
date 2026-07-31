import { useQuery } from "@tanstack/react-query";
import { getSubscriptionFinancialDashboard } from "@/services/subscription-financial-dashboard";

export function useSubscriptionFinancialDashboard(enabled = true) {
  return useQuery({
    queryKey: ["subscription-financial-dashboard"],
    queryFn: getSubscriptionFinancialDashboard,
    enabled,
    staleTime: 60_000,
  });
}
