import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const STORE_ADMIN_EMAIL = "santosluishenrique96@gmail.com";

export function useStoreAdmin() {
  const { user, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["store-admin", user?.id, user?.email],
    enabled: !authLoading && Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("current_user_is_store_admin");

      if (error) {
        throw error;
      }

      const emailMatchesAdmin = user?.email?.toLowerCase() === STORE_ADMIN_EMAIL;
      return Boolean(data) || emailMatchesAdmin;
    },
    staleTime: 60_000,
  });

  return {
    isAdmin: query.data ?? false,
    loading: authLoading || query.isLoading,
    error: query.error,
    user,
  };
}
