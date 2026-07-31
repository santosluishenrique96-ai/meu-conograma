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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useStoreAdmin } from "@/hooks/use-store-admin";
import { useAdminSubscriptionPlans, useSubscriptionPlanAdminMutations } from "@/hooks/use-subscription-plans";
import type { SubscriptionPlanRow, SubscriptionPlanFormValues, SubscriptionPlanIcon } from "@/types/subscriptions";
import {
  EMPTY_SUBSCRIPTION_PLAN_FORM,
  SUBSCRIPTION_PLAN_ICON_OPTIONS,
} from "@/types/subscriptions";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos — Administração" },
      {
        name: "description",
        content: "Gerencie os planos de assinatura do Meu Cronograma.",
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

function PlanosPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useStoreAdmin();
  const plansQuery = useAdminSubscriptionPlans(Boolean(user));
  const { savePlan, deletePlan, togglePlanStatus, updatePlanOrder } = useSubscriptionPlanAdminMutations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionPlanRow | null>(null);
  const [form, setForm] = useState<SubscriptionPlanFormValues>({ ...EMPTY_SUBSCRIPTION_PLAN_FORM });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth" });
    }
  }, [authLoading, navigate, user]);

  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const activePlans = useMemo(() => plans.filter((plan) => plan.is_active).length, [plans]);
  const inactivePlans = plans.length - activePlans;

  const openCreateDialog = () => {
    const nextDisplayOrder =
      plans.length > 0 ? Math.max(...plans.map((plan) => plan.display_order)) + 1 : 1;

    setForm({
      ...EMPTY_SUBSCRIPTION_PLAN_FORM,
      display_order: nextDisplayOrder,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (plan: SubscriptionPlanRow) => {
    setForm(getPlanFormValues(plan));
    setDialogOpen(true);
  };

  const handleChange = <K extends keyof SubscriptionPlanFormValues>(
    field: K,
    value: SubscriptionPlanFormValues[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    if (!form.name.trim()) {
      toast.error("Informe o nome do plano");
      return;
    }

    if (!form.button_text.trim()) {
      toast.error("Informe o texto do botao");
      return;
    }

    if (form.monthly_price < 0 || form.annual_price < 0 || (form.promotional_price ?? 0) < 0) {
      toast.error("Os valores do plano nao podem ser negativos");
      return;
    }

    if (form.free_trial_days < 0) {
      toast.error("Os dias de teste devem ser zero ou mais");
      return;
    }

    try {
      await savePlan.mutateAsync({ plan: form, userId: user.id });
      toast.success(form.id ? "Plano atualizado com sucesso" : "Plano criado com sucesso");
      setDialogOpen(false);
      setForm({ ...EMPTY_SUBSCRIPTION_PLAN_FORM });
    } catch (error) {
      const message = (error as { message?: string })?.message ?? "";
      if (message.toLowerCase().includes("duplicate")) {
        toast.error("Ja existe um plano com esse nome");
      } else {
        toast.error("Nao foi possivel salvar o plano agora");
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deletePlan.mutateAsync(deleteTarget.id);
      toast.success("Plano excluido com sucesso");
      setDeleteTarget(null);
    } catch {
      toast.error("Nao foi possivel excluir o plano");
    }
  };

  const handleToggleStatus = async (plan: SubscriptionPlanRow, isActive: boolean) => {
    if (!user) return;

    try {
      await togglePlanStatus.mutateAsync({ planId: plan.id, isActive, userId: user.id });
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
      await updatePlanOrder.mutateAsync({
        planId: plan.id,
        displayOrder: targetPlan.display_order,
        userId: user.id,
      });
      await updatePlanOrder.mutateAsync({
        planId: targetPlan.id,
        displayOrder: plan.display_order,
        userId: user.id,
      });
      toast.success("Ordem dos planos atualizada");
    } catch {
      toast.error("Nao foi possivel alterar a ordem dos planos");
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
              Cadastre, edite, ative, inative e organize os planos do SaaS sem fixar valores no
              codigo.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/produtos"
              search={{ focus: undefined }}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background/70 px-5 py-3 text-sm font-bold transition-smooth hover:border-primary hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar para produtos
            </Link>
            <Button type="button" onClick={openCreateDialog} className="rounded-full px-6 py-3 font-bold">
              <Plus className="h-4 w-4" /> Novo plano
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
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
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-gradient-card p-4 md:p-6">
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
              <Button type="button" onClick={openCreateDialog} className="mt-6 rounded-full">
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
                            style={{ backgroundColor: `${plan.color}20`, borderColor: `${plan.color}66` }}
                          >
                            <Icon className="h-5 w-5" style={{ color: plan.color }} />
                          </div>
                          <div className="space-y-1">
                            <div className="font-bold">{plan.name}</div>
                            <p className="max-w-xs text-xs text-muted-foreground">{plan.description}</p>
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
                            onCheckedChange={(checked) => void handleToggleStatus(plan, checked)}
                            disabled={togglePlanStatus.isPending}
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
                              disabled={index === 0 || updatePlanOrder.isPending}
                              onClick={() => void movePlan(plan, "up")}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={index === plans.length - 1 || updatePlanOrder.isPending}
                              onClick={() => void movePlan(plan, "down")}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEditDialog(plan)}>
                            <Pencil className="h-4 w-4" /> Editar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(plan)}
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
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setForm({ ...EMPTY_SUBSCRIPTION_PLAN_FORM });
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar plano" : "Novo plano"}</DialogTitle>
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
                  value={form.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  placeholder="Ex: Premium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Texto do botao
                </label>
                <Input
                  value={form.button_text}
                  onChange={(event) => handleChange("button_text", event.target.value)}
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
                value={form.description}
                onChange={(event) => handleChange("description", event.target.value)}
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
                  value={form.monthly_price}
                  onChange={(event) => handleChange("monthly_price", Number(event.target.value || 0))}
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
                  value={form.annual_price}
                  onChange={(event) => handleChange("annual_price", Number(event.target.value || 0))}
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
                  value={form.promotional_price ?? ""}
                  onChange={(event) =>
                    handleChange(
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
                  value={form.free_trial_days}
                  onChange={(event) =>
                    handleChange("free_trial_days", Number(event.target.value || 0))
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
                  value={form.display_order}
                  onChange={(event) => handleChange("display_order", Number(event.target.value || 0))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Cor
                </label>
                <Input
                  value={form.color}
                  onChange={(event) => handleChange("color", event.target.value)}
                  placeholder="#8B5CF6"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Badge
                </label>
                <Input
                  value={form.badge}
                  onChange={(event) => handleChange("badge", event.target.value)}
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
                  value={form.icon}
                  onValueChange={(value) => handleChange("icon", value as SubscriptionPlanIcon)}
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
                    {form.is_active ? "Plano ativo" : "Plano inativo"}
                  </span>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => handleChange("is_active", checked)}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-background/40 p-5">
              <div className="text-sm font-bold">Previa rapida</div>
              <div className="mt-4 flex items-start gap-4">
                <div
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border"
                  style={{ backgroundColor: `${form.color}20`, borderColor: `${form.color}66` }}
                >
                  {(() => {
                    const Icon = planIconMap[form.icon];
                    return <Icon className="h-5 w-5" style={{ color: form.color }} />;
                  })()}
                </div>
                <div className="space-y-2">
                  <div className="text-xl font-black">{form.name || "Nome do plano"}</div>
                  <p className="max-w-xl text-sm text-muted-foreground">
                    {form.description || "A descricao do plano aparecera aqui na previa."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {form.badge && <Badge variant="secondary">{form.badge}</Badge>}
                    <Badge variant={form.is_active ? "default" : "outline"}>
                      {form.button_text || "Escolher plano"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={savePlan.isPending}>
              {savePlan.isPending ? (
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

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Voce esta prestes a remover o plano "${deleteTarget.name}". Essa acao nao pode ser desfeita.`
                : "Confirme a exclusao do plano selecionado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePlan.isPending ? (
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
    </div>
  );
}
