CREATE TABLE public.store_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_store_admin(check_user UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.store_admins
    WHERE user_id = check_user
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_store_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_store_admin(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_store_admins()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.store_admins
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_store_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_store_admins() TO authenticated;

CREATE POLICY "Users view own admin membership"
ON public.store_admins
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "First authenticated user can claim store admin"
ON public.store_admins
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT public.has_store_admins()
);

CREATE POLICY "Existing admins can add store admins"
ON public.store_admins
FOR INSERT
WITH CHECK (public.is_store_admin(auth.uid()));

CREATE POLICY "Existing admins can update store admins"
ON public.store_admins
FOR UPDATE
USING (public.is_store_admin(auth.uid()))
WITH CHECK (public.is_store_admin(auth.uid()));

CREATE POLICY "Existing admins can delete store admins"
ON public.store_admins
FOR DELETE
USING (public.is_store_admin(auth.uid()));

CREATE TABLE public.products (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  price_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
  badge TEXT NOT NULL DEFAULT 'Destaque',
  focus TEXT NOT NULL DEFAULT 'Hidratação',
  benefits TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT NOT NULL DEFAULT '',
  external_url TEXT NOT NULL DEFAULT '',
  cta_mode TEXT NOT NULL DEFAULT 'carrinho',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT products_focus_check CHECK (
    focus IN ('Hidratação', 'Nutrição', 'Reconstrução', 'Finalização')
  ),
  CONSTRAINT products_cta_mode_check CHECK (
    cta_mode IN ('carrinho', 'whatsapp', 'link')
  )
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_products_sort_order
ON public.products (sort_order, created_at);

CREATE POLICY "Products are viewable by everyone"
ON public.products
FOR SELECT
USING (true);

CREATE POLICY "Store admins can insert products"
ON public.products
FOR INSERT
WITH CHECK (public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins can update products"
ON public.products
FOR UPDATE
USING (public.is_store_admin(auth.uid()))
WITH CHECK (public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins can delete products"
ON public.products
FOR DELETE
USING (public.is_store_admin(auth.uid()));

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.products (
  id,
  name,
  subtitle,
  price_value,
  badge,
  focus,
  benefits,
  image_url,
  external_url,
  cta_mode,
  sort_order
)
SELECT *
FROM (
  VALUES
    (
      'hidratacao-gloss',
      'Kit Hidratação Gloss',
      'Maciez intensa e brilho imediato',
      89.90,
      'Mais vendido',
      'Hidratação',
      ARRAY[
        'Máscara hidratante de alta performance',
        'Leave-in com proteção térmica',
        'Fórmula leve para uso semanal'
      ]::TEXT[],
      'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20haircare%20product%20jar%20and%20bottle%20for%20hydration%20treatment%2C%20luxury%20beauty%20ecommerce%20packshot%2C%20soft%20cyan%20background%2C%20realistic%20studio%20lighting&image_size=portrait_4_3',
      '',
      'carrinho',
      1
    ),
    (
      'nutricao-power-oils',
      'Kit Nutrição Power Oils',
      'Controle de frizz e nutrição profunda',
      109.90,
      'Favorito das cacheadas',
      'Nutrição',
      ARRAY[
        'Blend de óleos vegetais nutritivos',
        'Umectação com toque seco',
        'Ideal para fios ressecados e opacos'
      ]::TEXT[],
      'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=beauty%20haircare%20oil%20and%20mask%20kit%20for%20deep%20nutrition%2C%20premium%20ecommerce%20product%20photo%2C%20green%20background%2C%20realistic%20studio%20lighting&image_size=portrait_4_3',
      '',
      'carrinho',
      2
    ),
    (
      'reconstrucao-expert',
      'Kit Reconstrução Expert',
      'Força, elasticidade e reparo',
      129.90,
      'Tratamento intensivo',
      'Reconstrução',
      ARRAY[
        'Queratina inteligente para reposição de massa',
        'Máscara de reconstrução sem pesar',
        'Recuperação para fios fragilizados'
      ]::TEXT[],
      'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20reconstructive%20haircare%20kit%20with%20jar%20and%20treatment%20bottle%2C%20luxury%20beauty%20product%20packshot%2C%20rose%20background%2C%20realistic%20studio%20lighting&image_size=portrait_4_3',
      '',
      'carrinho',
      3
    )
) AS seed (
  id,
  name,
  subtitle,
  price_value,
  badge,
  focus,
  benefits,
  image_url,
  external_url,
  cta_mode,
  sort_order
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.products
);
