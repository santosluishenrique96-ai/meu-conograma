CREATE OR REPLACE FUNCTION public.is_store_admin(check_user UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    check_user IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.store_admins
        WHERE user_id = check_user
      )
      OR EXISTS (
        SELECT 1
        FROM auth.users
        WHERE id = check_user
          AND lower(email) = 'santosluishenrique96@gmail.com'
      )
    );
$$;

DROP POLICY IF EXISTS "First authenticated user can claim store admin" ON public.store_admins;

INSERT INTO public.store_settings (id, whatsapp_number)
VALUES ('main', '5575982796869')
ON CONFLICT (id) DO UPDATE
SET whatsapp_number = EXCLUDED.whatsapp_number;
