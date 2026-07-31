CREATE TABLE public.store_settings (
  id TEXT NOT NULL PRIMARY KEY,
  whatsapp_number TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store settings are viewable by everyone"
ON public.store_settings
FOR SELECT
USING (true);

CREATE POLICY "Store admins can insert store settings"
ON public.store_settings
FOR INSERT
WITH CHECK (public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins can update store settings"
ON public.store_settings
FOR UPDATE
USING (public.is_store_admin(auth.uid()))
WITH CHECK (public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins can delete store settings"
ON public.store_settings
FOR DELETE
USING (public.is_store_admin(auth.uid()));

CREATE TRIGGER update_store_settings_updated_at
BEFORE UPDATE ON public.store_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.store_settings (id, whatsapp_number)
VALUES ('main', '5575982796869')
ON CONFLICT (id) DO NOTHING;
