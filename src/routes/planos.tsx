import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  Crown,
  Gem,
  Heart,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  useAdminPlanFeatureAccess,
  useAdminSubscriptionFeatures,
  useSubscriptionPermissionAdminMutations,
} from "@/hooks/use-subscription-permissions";
import { useSubscriptionPlanAdminMutations, useAdminSubscriptionPlans } from "@/hooks/use-subscription-plans";
import { useStoreAdmin } from "@/hooks/use-store-admin";
import { buildPlanFeatureAccessMap } from "@/services/subscription-permissions";
import type {
  SubscriptionFeatureFormValues,
  SubscriptionFeatureRow,
  SubscriptionPlanFormValues,
  SubscriptionPlanIcon,
  SubscriptionPlanRow,
} from "@/types/subscriptions";
import {
  EMPTY_SUBSCRIPTION_FEATURE_FORM,
  EMPTY_SUBSCRIPTION_PLAN_FORM,
  SUBSCRIPTION_PLAN_ICON_OPTIONS,
} from "@/types/subscriptions";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos — Administração" },
      {
        name: "description",
        content: "Gerencie os planos, recursos e permissoes do Meu Cronograma.",
      },
    ],
  }),
  component: PlanosPage,
});

const planIconMap = {
  sparkles: Sparkles,
  "shield-check": ShieldCheck,
  crown: Crown,
  star: Star,
  gem: Gem,
  calendar: CalendarDays,
  heart: Heart,
  "wand-2": Wand2,
} satisfies Record<SubscriptionPlanIcon, typeof Sparkles>;

function formatCurrency(value: number | null) {
  if (value === null) return "Nao definido";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getPlanFormValues(plan?: SubscriptionPlanRow): SubscriptionPlanFormValues {
  if (!plan) return { ...EMPTY_SUBSCRIPTION_PLAN_FORM };

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    monthly_price: plan.monthly_price,
    annual_price: plan.annual_price,
    promotional_price: plan.promotional_price,
    free_trial_days: plan.free_trial_days,
    color: plan.color,
    icon: (SUBSCRIPTION_PLAN_ICON_OPTIONS.includes(plan.icon as SubscriptionPlanIcon)
      ? plan.icon
      : "sparkles") as SubscriptionPlanIcon,
    button_text: plan.button_text,
    badge: plan.badge ?? "",
    display_order: plan.display_order,
    is_active: plan.is_active,
  };
}

function getFeatureFormValues(feature?: SubscriptionFeatureRow): SubscriptionFeatureFormValues {
  if (!feature) return { ...EMPTY_SUBSCRIPTION_FEATURE_FORM };

  return {
    id: feature.id,
    feature_key: feature.feature_key,
    name: feature.name,
    description: feature.description,
    category: feature.category,
    display_order: feature.display_order,
    is_active: feature.is_active,
  };
}

function PlanosPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useStoreAdmin();

  const plansQuery = useAdminSubscriptionPlans(Boolean(user));
  const featuresQuery = useAdminSubscriptionFeatures(Boolean(user));
  const accessQuery = useAdminPlanFeatureAccess(Boolean(user));

  const planMutations = useSubscriptionPlanAdminMutations();
  const permissionMutations = useSubscriptionPermissionAdminMutations();

  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planDeleteTarget, setPlanDeleteTarget] = useState<SubscriptionPlanRow | null>(null);
  const [planForm, setPlanForm] = useState<SubscriptionPlanFormValues>({
    ...EMPTY_SUBSCRIPTION_PLAN_FORM,
  });

  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [featureDeleteTarget, setFeatureDeleteTarget] = useState<SubscriptionFeatureRow | null>(null);
  const [featureForm, setFeatureForm] = useState<SubscriptionFeatureFormValues>({
    ...EMPTY_SUBSCRIPTION_FEATURE_FORM,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth" });
    }
  }, [authLoading, navigate, user]);

  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const features = useMemo(() => featuresQuery.data ?? [], [featuresQuery.data]);
  const featureAccessMap = useMemo(
    () => buildPlanFeatureAccessMap(accessQuery.data ?? []),
    [accessQuery.data],
  );

  const activePlans = useMemo(() => plans.filter((plan) => plan.is_active).length, [plans]);
  const inactivePlans = plans.length - activePlans;
  const activeFeatures = useMemo(
    () => features.filter((feature) => feature.is_active).length,
    [features],
  );

  const openCreatePlanDialog = () => {
    const nextDisplayOrder =
      plans.length > 0 ? Math.max(...plans.map((plan) => plan.display_order)) + 1 : 1;

    setPlanForm({
      ...EMPTY_SUBSCRIPTION_PLAN_FORM,
      display_order: nextDisplayOrder,
    });
    setPlanDialogOpen(true);
  };

  const openEditPlanDialog = (plan: SubscriptionPlanRow) => {
    setPlanForm(getPlanFormValues(plan));
    setPlanDialogOpen(true);
  };

  const openCreateFeatureDialog = () => {
    const nextDisplayOrder =
      features.length > 0 ? Math.max(...features.map((feature) => feature.display_order)) + 1 : 1;

    setFeatureForm({
      ...EMPTY_SUBSCRIPTION_FEATURE_FORM,
      display_order: nextDisplayOrder,
    });
    setFeatureDialogOpen(true);
  };

  const openEditFeatureDialog = (feature: SubscriptionFeatureRow) => {
    setFeatureForm(getFeatureFormValues(feature));
    setFeatureDialogOpen(true);
  };

  const handlePlanChange = <K extends keyof SubscriptionPlanFormValues>(
    field: K,
    value: SubscriptionPlanFormValues[K],
  ) => {
    setPlanForm((current) => ({ ...current, [field]: value }));
  };

  const handleFeatureChange = <K extends keyof SubscriptionFeatureFormValues>(
    field: K,
    value: SubscriptionFeatureFormValues[K],
  ) => {
    setFeatureForm((current) => ({ ...current, [field]: value }));
  };

  const handleSavePlan = async () => {
    if (!user) return;

    if (!planForm.name.trim()) {
      toast.error("Informe o nome do plano");
      return;
    }

    if (!planForm.button_text.trim()) {
      toast.error("Informe o texto do botao");
      return;
    }

    if (
      planForm.monthly_price < 0 ||
      planForm.annual_price < 0 ||
      (planForm.promotional_price ?? 0) < 0
    ) {
      toast.error("Os valores do plano nao podem ser negativos");
      return;
    }

    if (planForm.free_trial_days < 0) {
      toast.error("Os dias de teste devem ser zero ou mais");
      return;
    }

    try {
      await planMutations.savePlan.mutateAsync({ plan: planForm, userId: user.id });
      toast.success(planForm.id ? "Plano atualizado com sucesso" : "Plano criado com sucesso");
      setPlanDialogOpen(false);
      setPlanForm({ ...EMPTY_SUBSCRIPTION_PLAN_FORM });
    } catch (error) {
      const message = (error as { message?: string })?.message ?? "";
      if (message.toLowerCase().includes("duplicate")) {
        toast.error("Ja existe um plano com esse nome");
      } else {
        toast.error("Nao foi possivel salvar o plano agora");
      }
    }
  };

  const handleDeletePlan = async () => {
    if (!planDeleteTarget) return;

    try {
      await planMutations.deletePlan.mutateAsync(planDeleteTarget.id);
      toast.success("Plano excluido com sucesso");
      setPlanDeleteTarget(null);
    } catch {
      toast.error("Nao foi possivel excluir o plano");
    }
  };

  const handleTogglePlanStatus = async (plan: SubscriptionPlanRow, isActive: boolean) => {
    if (!user) return;

    try {
      await planMutations.togglePlanStatus.mutateAsync({
        planId: plan.id,
        isActive,
        userId: user.id,
      });
      toast.success(isActive ? "Plano ativado" : "Plano inativado");
    } catch {
      toast.error("Nao foi possivel atualizar o status do plano");
    }
  };

  const movePlan = async (plan: SubscriptionPlanRow, direction: "up" | "down") => {
    if (!user) return;

    const index = plans.findIndex((item) => item.id === plan.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const targetPlan = plans[targetIndex];

    if (index === -1 || !targetPlan) return;

    try {
      await planMutations.updatePlanOrder.mutateAsync({
        planId: plan.id,
        displayOrder: targetPlan.display_order,
        userId: user.id,
      });
      await planMutations.updatePlanOrder.mutateAsync({
        planId: targetPlan.id,
        displayOrder: plan.display_order,
        userId: user.id,
      });
      toast.success("Ordem dos planos atualizada");
    } catch {
      toast.error("Nao foi possivel alterar a ordem dos planos");
    }
  };

  const handleSaveFeature = async () => {
    if (!user) return;

    if (!featureForm.name.trim()) {
      toast.error("Informe o nome do recurso");
      return;
    }

    if (!featureForm.category.trim()) {
      toast.error("Informe a categoria do recurso");
      return;
    }

    try {
      await permissionMutations.saveFeature.mutateAsync({
        feature: featureForm,
        userId: user.id,
      });
      toast.success(featureForm.id ? "Recurso atualizado com sucesso" : "Recurso criado com sucesso");
      setFeatureDialogOpen(false);
      setFeatureForm({ ...EMPTY_SUBSCRIPTION_FEATURE_FORM });
    } catch (error) {
      const message = (error as { message?: string })?.message ?? "";
      if (message.toLowerCase().includes("duplicate")) {
        toast.error("Ja existe um recurso com essa chave");
      } else {
        toast.error("Nao foi possivel salvar o recurso agora");
      }
    }
  };

  const handleDeleteFeature = async () => {
    if (!featureDeleteTarget) return;

    try {
      await permissionMutations.deleteFeature.mutateAsync(featureDeleteTarget.id);
      toast.success("Recurso excluido com sucesso");
      setFeatureDeleteTarget(null);
    } catch {
      toast.error("Nao foi possivel excluir o recurso");
    }
  };

  const handleTogglePlanFeature = async (
    planId: string,
    featureId: string,
    isEnabled: boolean,
  ) => {
    if (!user) return;

    try {
      await permissionMutations.togglePlanFeature.mutateAsync({
        planId,
        featureId,
        isEnabled,
        userId: user.id,
      });
      toast.success(isEnabled ? "Permissao liberada" : "Permissao bloqueada");
    } catch {
      toast.error("Nao foi possivel atualizar essa permissao");
    }
  };

  if (authLoading || adminLoading || !user) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-3xl border border-border bg-gradient-card p-8 text-center shadow-elegant">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h1 className="mt-4 text-2xl font-black">Carregando administracao</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos validando seu acesso ao painel de planos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-gradient-card p-8 text-center shadow-elegant">
            <Settings2 className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-4 text-3xl font-black">Acesso restrito</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Apenas administradores podem gerenciar os planos de assinatura.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                to="/produtos"
                search={{ focus: undefined }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-5 py-3 text-sm font-bold transition-smooth hover:border-primary hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar para a loja
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Settings2 className="h-3.5 w-3.5" /> Painel administrativo
            </span>
            <h1 className="mt-4 text-4xl font-black md:text-5xl">
              Gerenciar <span className="text-gradient">Planos</span>
            </h1>
            <p className="mt-3 text-muted-foreground">
              Controle os planos do SaaS e as permissoes individuais de cada recurso sem fixar
              regras no codigo.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/financeiro"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background/70 px-5 py-3 text-sm font-bold transition-smooth hover:border-primary hover:text-primary"
            >
              <Sparkles className="h-4 w-4" /> Dashboard financeiro
            </Link>
            <Link
              to="/produtos"
              search={{ focus: undefined }}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background/70 px-5 py-3 text-sm font-bold transition-smooth hover:border-primary hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar para produtos
            </Link>
            <Button
              type="button"
              onClick={openCreatePlanDialog}
              className="rounded-full px-6 py-3 font-bold"
            >
              <Plus className="h-4 w-4" /> Novo plano
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-border bg-gradient-card p-5">
            <div className="text-sm text-muted-foreground">Total de planos</div>
            <div className="mt-2 text-3xl font-black">{plans.length}</div>
          </div>
          <div className="rounded-3xl border border-border bg-gradient-card p-5">
            <div className="text-sm text-muted-foreground">Planos ativos</div>
            <div className="mt-2 text-3xl font-black text-primary">{activePlans}</div>
          </div>
          <div className="rounded-3xl border border-border bg-gradient-card p-5">
            <div className="text-sm text-muted-foreground">Planos inativos</div>
            <div className="mt-2 text-3xl font-black">{inactivePlans}</div>
          </div>
          <div className="rounded-3xl border border-border bg-gradient-card p-5">
            <div className="text-sm text-muted-foreground">Recursos ativos</div>
            <div className="mt-2 text-3xl font-black">{activeFeatures}</div>
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-border bg-gradient-card p-4 md:p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-black">Cadastro de planos</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Valores, textos, ordem e status continuam totalmente controlados pelo banco.
              </p>
            </div>
          </div>

          {plansQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando planos...
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center">
              <h2 className="text-2xl font-black">Nenhum plano cadastrado</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Crie o primeiro plano para preparar a area de assinaturas do SaaS.
              </p>
              <Button type="button" onClick={openCreatePlanDialog} className="mt-6 rounded-full">
                <Plus className="h-4 w-4" /> Criar primeiro plano
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead>Precos</TableHead>
                  <TableHead>Teste</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan, index) => {
                  const Icon = planIconMap[
                    SUBSCRIPTION_PLAN_ICON_OPTIONS.includes(plan.icon as SubscriptionPlanIcon)
                      ? (plan.icon as SubscriptionPlanIcon)
                      : "sparkles"
                  ];

                  return (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div
                            className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border"
                            style={{
                              backgroundColor: `${plan.color}20`,
                              borderColor: `${plan.color}66`,
                            }}
                          >
                            <Icon className="h-5 w-5" style={{ color: plan.color }} />
                          </div>
                          <div className="space-y-1">
                            <div className="font-bold">{plan.name}</div>
                            <p className="max-w-xs text-xs text-muted-foreground">
                              {plan.description}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {plan.badge && <Badge variant="secondary">{plan.badge}</Badge>}
                              <Badge variant={plan.is_active ? "default" : "outline"}>
                                {plan.button_text}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div>Mensal: {formatCurrency(plan.monthly_price)}</div>
                          <div>Anual: {formatCurrency(plan.annual_price)}</div>
                          <div>Promo: {formatCurrency(plan.promotional_price)}</div>
                        </div>
                      </TableCell>
                      <TableCell>{plan.free_trial_days} dias</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={plan.is_active}
                            onCheckedChange={(checked) => void handleTogglePlanStatus(plan, checked)}
                            disabled={planMutations.togglePlanStatus.isPending}
                          />
                          <span className="text-sm text-muted-foreground">
                            {plan.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="min-w-8 text-sm font-bold">{plan.display_order}</span>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={index === 0 || planMutations.updatePlanOrder.isPending}
                              onClick={() => void movePlan(plan, "up")}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={
                                index === plans.length - 1 || planMutations.updatePlanOrder.isPending
                              }
                              onClick={() => void movePlan(plan, "down")}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditPlanDialog(plan)}
                          >
                            <Pencil className="h-4 w-4" /> Editar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setPlanDeleteTarget(plan)}
                          >
                            <Trash2 className="h-4 w-4" /> Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-border bg-gradient-card p-4 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <KeyRound className="h-3.5 w-3.5" /> Permissoes por plano
              </span>
              <h2 className="mt-4 text-3xl font-black">Recursos e liberacoes</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Cada recurso fica salvo no banco e pode ser habilitado ou bloqueado para qualquer
                plano sem alterar funcionalidades existentes.
              </p>
            </div>
            <Button
              type="button"
              onClick={openCreateFeatureDialog}
              className="rounded-full px-6 py-3 font-bold"
            >
              <Plus className="h-4 w-4" /> Novo recurso
            </Button>
          </div>

          <div className="mt-6 rounded-3xl border border-border bg-background/40 p-4">
            {featuresQuery.isLoading || accessQuery.isLoading || plansQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Carregando matriz de permissoes...
              </div>
            ) : features.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border p-12 text-center">
                <h3 className="text-2xl font-black">Nenhum recurso cadastrado</h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  Crie um recurso para comecar a controlar o que cada plano pode acessar.
                </p>
                <Button type="button" onClick={openCreateFeatureDialog} className="mt-6 rounded-full">
                  <Plus className="h-4 w-4" /> Criar primeiro recurso
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    {plans.map((plan) => (
                      <TableHead key={plan.id} className="min-w-[140px]">
                        <div className="space-y-1">
                          <div className="font-bold text-foreground">{plan.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {plan.is_active ? "Plano ativo" : "Plano inativo"}
                          </div>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {features.map((feature) => (
                    <TableRow key={feature.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-bold">{feature.name}</div>
                          <div className="text-xs text-muted-foreground">{feature.description}</div>
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            {feature.feature_key}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{feature.category}</TableCell>
                      <TableCell>
                        <Badge variant={feature.is_active ? "default" : "outline"}>
                          {feature.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      {plans.map((plan) => (
                        <TableCell key={`${plan.id}-${feature.id}`}>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={Boolean(featureAccessMap[plan.id]?.[feature.id])}
                              onCheckedChange={(checked) =>
                                void handleTogglePlanFeature(plan.id, feature.id, checked)
                              }
                              disabled={permissionMutations.togglePlanFeature.isPending}
                            />
                            <span className="text-xs text-muted-foreground">
                              {featureAccessMap[plan.id]?.[feature.id] ? "Liberado" : "Bloqueado"}
                            </span>
                          </div>
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditFeatureDialog(feature)}
                          >
                            <Pencil className="h-4 w-4" /> Editar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setFeatureDeleteTarget(feature)}
                          >
                            <Trash2 className="h-4 w-4" /> Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      </div>

      <Dialog
        open={planDialogOpen}
        onOpenChange={(open) => {
          setPlanDialogOpen(open);
          if (!open) {
            setPlanForm({ ...EMPTY_SUBSCRIPTION_PLAN_FORM });
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{planForm.id ? "Editar plano" : "Novo plano"}</DialogTitle>
            <DialogDescription>
              Gerencie todos os dados do plano sem fixar valores no codigo da aplicacao.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nome
                </label>
                <Input
                  value={planForm.name}
                  onChange={(event) => handlePlanChange("name", event.target.value)}
                  placeholder="Ex: Premium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Texto do botao
                </label>
                <Input
                  value={planForm.button_text}
                  onChange={(event) => handlePlanChange("button_text", event.target.value)}
                  placeholder="Ex: Assinar agora"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Descricao
              </label>
              <Textarea
                rows={4}
                value={planForm.description}
                onChange={(event) => handlePlanChange("description", event.target.value)}
                placeholder="Descreva rapidamente para quem esse plano foi pensado."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Preco mensal
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={planForm.monthly_price}
                  onChange={(event) =>
                    handlePlanChange("monthly_price", Number(event.target.value || 0))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Preco anual
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={planForm.annual_price}
                  onChange={(event) =>
                    handlePlanChange("annual_price", Number(event.target.value || 0))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Preco promocional
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={planForm.promotional_price ?? ""}
                  onChange={(event) =>
                    handlePlanChange(
                      "promotional_price",
                      event.target.value === "" ? null : Number(event.target.value),
                    )
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Dias de teste
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={planForm.free_trial_days}
                  onChange={(event) =>
                    handlePlanChange("free_trial_days", Number(event.target.value || 0))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ordem
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={planForm.display_order}
                  onChange={(event) =>
                    handlePlanChange("display_order", Number(event.target.value || 0))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Cor
                </label>
                <Input
                  value={planForm.color}
                  onChange={(event) => handlePlanChange("color", event.target.value)}
                  placeholder="#8B5CF6"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Badge
                </label>
                <Input
                  value={planForm.badge}
                  onChange={(event) => handlePlanChange("badge", event.target.value)}
                  placeholder="Ex: Mais popular"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Icone
                </label>
                <Select
                  value={planForm.icon}
                  onValueChange={(value) => handlePlanChange("icon", value as SubscriptionPlanIcon)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um icone" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBSCRIPTION_PLAN_ICON_OPTIONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        {icon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Status
                </label>
                <div className="flex h-9 items-center justify-between rounded-md border border-input px-3">
                  <span className="text-sm text-muted-foreground">
                    {planForm.is_active ? "Plano ativo" : "Plano inativo"}
                  </span>
                  <Switch
                    checked={planForm.is_active}
                    onCheckedChange={(checked) => handlePlanChange("is_active", checked)}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-background/40 p-5">
              <div className="text-sm font-bold">Previa rapida</div>
              <div className="mt-4 flex items-start gap-4">
                <div
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor: `${planForm.color}20`,
                    borderColor: `${planForm.color}66`,
                  }}
                >
                  {(() => {
                    const Icon = planIconMap[planForm.icon];
                    return <Icon className="h-5 w-5" style={{ color: planForm.color }} />;
                  })()}
                </div>
                <div className="space-y-2">
                  <div className="text-xl font-black">{planForm.name || "Nome do plano"}</div>
                  <p className="max-w-xl text-sm text-muted-foreground">
                    {planForm.description || "A descricao do plano aparecera aqui na previa."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {planForm.badge && <Badge variant="secondary">{planForm.badge}</Badge>}
                    <Badge variant={planForm.is_active ? "default" : "outline"}>
                      {planForm.button_text || "Escolher plano"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setPlanDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleSavePlan()}
              disabled={planMutations.savePlan.isPending}
            >
              {planMutations.savePlan.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Salvar plano
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={featureDialogOpen}
        onOpenChange={(open) => {
          setFeatureDialogOpen(open);
          if (!open) {
            setFeatureForm({ ...EMPTY_SUBSCRIPTION_FEATURE_FORM });
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{featureForm.id ? "Editar recurso" : "Novo recurso"}</DialogTitle>
            <DialogDescription>
              Cadastre os recursos que poderao ser liberados ou bloqueados por plano.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nome
                </label>
                <Input
                  value={featureForm.name}
                  onChange={(event) => handleFeatureChange("name", event.target.value)}
                  placeholder="Ex: Conteudo Premium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Chave tecnica
                </label>
                <Input
                  value={featureForm.feature_key}
                  onChange={(event) => handleFeatureChange("feature_key", event.target.value)}
                  placeholder="Ex: conteudo-premium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Descricao
              </label>
              <Textarea
                rows={4}
                value={featureForm.description}
                onChange={(event) => handleFeatureChange("description", event.target.value)}
                placeholder="Explique o que esse recurso representa dentro do produto."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Categoria
                </label>
                <Input
                  value={featureForm.category}
                  onChange={(event) => handleFeatureChange("category", event.target.value)}
                  placeholder="Ex: IA"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ordem
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={featureForm.display_order}
                  onChange={(event) =>
                    handleFeatureChange("display_order", Number(event.target.value || 0))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Status
                </label>
                <div className="flex h-9 items-center justify-between rounded-md border border-input px-3">
                  <span className="text-sm text-muted-foreground">
                    {featureForm.is_active ? "Recurso ativo" : "Recurso inativo"}
                  </span>
                  <Switch
                    checked={featureForm.is_active}
                    onCheckedChange={(checked) => handleFeatureChange("is_active", checked)}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setFeatureDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveFeature()}
              disabled={permissionMutations.saveFeature.isPending}
            >
              {permissionMutations.saveFeature.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Salvar recurso
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(planDeleteTarget)}
        onOpenChange={(open) => !open && setPlanDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription>
              {planDeleteTarget
                ? `Voce esta prestes a remover o plano "${planDeleteTarget.name}". Essa acao nao pode ser desfeita.`
                : "Confirme a exclusao do plano selecionado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeletePlan()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {planMutations.deletePlan.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Excluir plano
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(featureDeleteTarget)}
        onOpenChange={(open) => !open && setFeatureDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recurso?</AlertDialogTitle>
            <AlertDialogDescription>
              {featureDeleteTarget
                ? `Voce esta prestes a remover o recurso "${featureDeleteTarget.name}". As permissoes ligadas a ele tambem serao apagadas.`
                : "Confirme a exclusao do recurso selecionado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteFeature()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {permissionMutations.deleteFeature.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Excluir recurso
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
