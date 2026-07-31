CREATE TABLE public.subscription_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Geral',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_features_order
ON public.subscription_features (display_order, created_at);

ALTER TABLE public.subscription_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subscription features public read active"
ON public.subscription_features
FOR SELECT
USING (is_active OR public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins can insert subscription features"
ON public.subscription_features
FOR INSERT
WITH CHECK (public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins can update subscription features"
ON public.subscription_features
FOR UPDATE
USING (public.is_store_admin(auth.uid()))
WITH CHECK (public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins can delete subscription features"
ON public.subscription_features
FOR DELETE
USING (public.is_store_admin(auth.uid()));

GRANT SELECT ON TABLE public.subscription_features TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subscription_features TO authenticated;

CREATE TRIGGER update_subscription_features_updated_at
BEFORE UPDATE ON public.subscription_features
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.plan_feature_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.subscription_features(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plan_feature_access_unique UNIQUE (plan_id, feature_id)
);

CREATE INDEX idx_plan_feature_access_plan
ON public.plan_feature_access (plan_id, feature_id);

CREATE INDEX idx_plan_feature_access_feature
ON public.plan_feature_access (feature_id, plan_id);

ALTER TABLE public.plan_feature_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan feature access public read active"
ON public.plan_feature_access
FOR SELECT
USING (
  public.is_store_admin(auth.uid())
  OR (
    EXISTS (
      SELECT 1
      FROM public.subscription_plans plans
      WHERE plans.id = plan_feature_access.plan_id
        AND plans.is_active = true
    )
    AND EXISTS (
      SELECT 1
      FROM public.subscription_features features
      WHERE features.id = plan_feature_access.feature_id
        AND features.is_active = true
    )
  )
);

CREATE POLICY "Store admins can insert plan feature access"
ON public.plan_feature_access
FOR INSERT
WITH CHECK (public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins can update plan feature access"
ON public.plan_feature_access
FOR UPDATE
USING (public.is_store_admin(auth.uid()))
WITH CHECK (public.is_store_admin(auth.uid()));

CREATE POLICY "Store admins can delete plan feature access"
ON public.plan_feature_access
FOR DELETE
USING (public.is_store_admin(auth.uid()));

GRANT SELECT ON TABLE public.plan_feature_access TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.plan_feature_access TO authenticated;

CREATE TRIGGER update_plan_feature_access_updated_at
BEFORE UPDATE ON public.plan_feature_access
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.subscription_features (
  feature_key,
  name,
  description,
  category,
  display_order,
  is_active
)
VALUES
  (
    'cronograma-personalizado',
    'Cronograma personalizado',
    'Libera configuracoes personalizadas para a rotina capilar.',
    'Rotina',
    1,
    true
  ),
  (
    'calendario',
    'Calendario',
    'Exibe a visualizacao de calendario do tratamento.',
    'Rotina',
    2,
    true
  ),
  (
    'agenda',
    'Agenda',
    'Permite organizar compromissos e etapas do cuidado.',
    'Rotina',
    3,
    true
  ),
  (
    'lembretes',
    'Lembretes',
    'Ativa lembretes para nao perder as etapas do cronograma.',
    'Rotina',
    4,
    true
  ),
  (
    'fotos',
    'Fotos',
    'Permite salvar fotos de acompanhamento.',
    'Evolucao',
    5,
    true
  ),
  (
    'antes-e-depois',
    'Antes e Depois',
    'Libera comparacao de resultados entre fotos.',
    'Evolucao',
    6,
    true
  ),
  (
    'produtos-favoritos',
    'Produtos Favoritos',
    'Permite marcar e acompanhar produtos preferidos.',
    'Loja',
    7,
    true
  ),
  (
    'receitas',
    'Receitas',
    'Desbloqueia receitas e cuidados especiais.',
    'Conteudo',
    8,
    true
  ),
  (
    'conteudo-premium',
    'Conteudo Premium',
    'Libera conteudos exclusivos dentro da plataforma.',
    'Conteudo',
    9,
    true
  ),
  (
    'analise-por-ia',
    'Analise por IA',
    'Habilita analises avancadas com inteligencia artificial.',
    'IA',
    10,
    true
  ),
  (
    'diagnostico-capilar',
    'Diagnostico Capilar',
    'Permite gerar o diagnostico capilar do usuario.',
    'IA',
    11,
    true
  ),
  (
    'historico-completo',
    'Historico Completo',
    'Mostra o historico completo de registros e acompanhamento.',
    'Evolucao',
    12,
    true
  ),
  (
    'notificacoes-inteligentes',
    'Notificacoes Inteligentes',
    'Ativa notificacoes com logica avancada e contexto.',
    'Automacao',
    13,
    true
  ),
  (
    'suporte-prioritario',
    'Suporte Prioritario',
    'Libera atendimento prioritario para assinantes.',
    'Suporte',
    14,
    true
  )
ON CONFLICT (feature_key) DO NOTHING;

INSERT INTO public.plan_feature_access (
  plan_id,
  feature_id,
  is_enabled
)
SELECT
  plans.id,
  features.id,
  CASE
    WHEN plans.slug = 'premium' THEN true
    WHEN plans.slug = 'essencial' THEN features.feature_key IN (
      'cronograma-personalizado',
      'calendario',
      'agenda',
      'lembretes',
      'fotos',
      'antes-e-depois',
      'produtos-favoritos',
      'receitas',
      'diagnostico-capilar',
      'historico-completo',
      'notificacoes-inteligentes'
    )
    WHEN plans.slug = 'gratuito' THEN features.feature_key IN (
      'calendario',
      'agenda',
      'lembretes',
      'fotos',
      'produtos-favoritos',
      'receitas',
      'diagnostico-capilar'
    )
    ELSE false
  END
FROM public.subscription_plans plans
CROSS JOIN public.subscription_features features
ON CONFLICT (plan_id, feature_id) DO NOTHING;
