import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Check,
  Droplet,
  Leaf,
  Wrench,
  Sun,
  Moon,
  Calendar as CalendarIcon,
  Sparkles,
  Settings,
  Save,
  Camera,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/cronograma")({
  head: () => ({
    meta: [
      { title: "Meu Cronograma — Plano Capilar Personalizado" },
      {
        name: "description",
        content:
          "Veja seu cronograma diário, semanal e mensal com hidratação, nutrição e reconstrução.",
      },
    ],
  }),
  component: CronogramaPage,
});

type Tab = "diario" | "semanal" | "mensal";
type FocusType = "Hidratação" | "Nutrição" | "Reconstrução" | "Descanso" | "Cuidado";

const FOCUS_TYPES: Record<FocusType, { icon: LucideIcon; color: string; desc: string }> = {
  Hidratação: {
    icon: Droplet,
    color: "from-blue-500 to-cyan-400",
    desc: "Reposição de água — fios macios e brilhantes.",
  },
  Nutrição: {
    icon: Leaf,
    color: "from-emerald-500 to-lime-400",
    desc: "Reposição de lipídios — controle de frizz.",
  },
  Reconstrução: {
    icon: Wrench,
    color: "from-rose-500 to-orange-400",
    desc: "Reposição de massa — força e elasticidade.",
  },
  Descanso: {
    icon: Sparkles,
    color: "from-violet-500 to-fuchsia-400",
    desc: "Co-wash leve e finalização natural.",
  },
  Cuidado: {
    icon: Sparkles,
    color: "from-pink-500 to-fuchsia-400",
    desc: "Esfoliação do couro cabeludo + óleo capilar.",
  },
};

const DAYS = [
  { key: "monday", label: "Segunda" },
  { key: "tuesday", label: "Terça" },
  { key: "wednesday", label: "Quarta" },
  { key: "thursday", label: "Quinta" },
  { key: "friday", label: "Sexta" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];

const HAIR_TYPES = ["Liso", "Ondulado", "Cacheado", "Crespo"];
const GOALS = ["Crescimento", "Brilho", "Reduzir frizz", "Recuperar danificados", "Manutenção"];

const diario = [
  {
    time: "Manhã",
    icon: Sun,
    title: "Despertar dos fios",
    steps: [
      "Pentear com escova de cerdas naturais",
      "Aplicar leave-in de proteção térmica",
      "Finalizar com sérum nas pontas",
    ],
  },
  {
    time: "Tarde",
    icon: Droplet,
    title: "Hidratação rápida",
    steps: [
      "Borrifar água termal nos fios",
      "Retoque com creme para pentear",
      "Proteger do sol e poluição",
    ],
  },
  {
    time: "Noite",
    icon: Moon,
    title: "Reparo noturno",
    steps: [
      "Massagear o couro cabeludo por 3 min",
      "Aplicar óleo capilar nas pontas",
      "Dormir com fronha de seda ou cetim",
    ],
  },
];

const mensal = [
  {
    week: "Semana 1",
    focus: "Reset Capilar",
    tasks: [
      "Limpeza profunda com shampoo antirresíduo",
      "Hidratação reparadora",
      "Corte de pontas (se necessário)",
    ],
  },
  {
    week: "Semana 2",
    focus: "Intensivo de Nutrição",
    tasks: ["Nutrição com óleos vegetais", "Umectação noturna 1x", "Foto de acompanhamento"],
  },
  {
    week: "Semana 3",
    focus: "Força & Reconstrução",
    tasks: ["Reconstrução com queratina", "Banho de brilho", "Avaliação de elasticidade"],
  },
  {
    week: "Semana 4",
    focus: "Brilho & Manutenção",
    tasks: ["Hidratação selante", "Hidratação ácida (vinagre de maçã)", "Avaliação dos resultados"],
  },
];

type Prefs = {
  hair_type: string | null;
  goal: string | null;
  monday: FocusType;
  tuesday: FocusType;
  wednesday: FocusType;
  thursday: FocusType;
  friday: FocusType;
  saturday: FocusType;
  sunday: FocusType;
};

const DEFAULT_PREFS: Prefs = {
  hair_type: null,
  goal: null,
  monday: "Hidratação",
  tuesday: "Descanso",
  wednesday: "Nutrição",
  thursday: "Descanso",
  friday: "Hidratação",
  saturday: "Reconstrução",
  sunday: "Cuidado",
};

const focusOptions = Object.keys(FOCUS_TYPES) as FocusType[];

function parseFocusType(value: string): FocusType {
  return value in FOCUS_TYPES ? (value as FocusType) : "Cuidado";
}

function CronogramaPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("semanal");
  const [done, setDone] = useState<Set<string>>(new Set());
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [loading, navigate, user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("schedule_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data)
          setPrefs({
            hair_type: data.hair_type,
            goal: data.goal,
            monday: parseFocusType(data.monday),
            tuesday: parseFocusType(data.tuesday),
            wednesday: parseFocusType(data.wednesday),
            thursday: parseFocusType(data.thursday),
            friday: parseFocusType(data.friday),
            saturday: parseFocusType(data.saturday),
            sunday: parseFocusType(data.sunday),
          });
      });
  }, [user]);

  const savePrefs = async () => {
    if (!user) {
      toast.error("Faça login para salvar sua personalização");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("schedule_preferences")
      .upsert({ user_id: user.id, ...prefs }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error("Erro ao salvar");
    else {
      toast.success("Cronograma personalizado!");
      setShowSettings(false);
    }
  };

  const toggle = (key: string) => {
    setDone((prev) => {
      const n = new Set(prev);
      if (n.has(key)) {
        n.delete(key);
      } else {
        n.add(key);
      }
      return n;
    });
  };

  const updateDayPreference = (day: DayKey, focus: FocusType) => {
    setPrefs((prev) => {
      const nextPrefs: Prefs = { ...prev, [day]: focus };
      return nextPrefs;
    });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-3xl border border-border bg-gradient-card p-8 text-center shadow-elegant">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h1 className="mt-4 text-2xl font-black">Preparando seu cronograma</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos verificando sua conta para carregar sua rotina capilar.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <CalendarIcon className="h-3.5 w-3.5" /> Seu cronograma personalizado
            </span>
            <h1 className="mt-5 text-4xl md:text-5xl font-black leading-tight">
              Olá, linda! <span className="text-gradient">Vamos cuidar</span> dos seus fios hoje?
            </h1>
            <p className="mt-3 text-muted-foreground">
              {prefs.hair_type || prefs.goal
                ? `Plano para cabelo ${prefs.hair_type?.toLowerCase() || ""}${prefs.goal ? ` · foco em ${prefs.goal.toLowerCase()}` : ""}.`
                : "Acompanhe sua rotina e marque cada conquista. Consistência é o segredo."}
            </p>
          </div>
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-2 text-sm font-bold transition-smooth hover:border-primary hover:text-primary"
          >
            <Settings className="h-4 w-4" /> Personalizar
          </button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="mt-6 rounded-3xl bg-gradient-card border border-primary/30 p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                <Settings className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="font-bold">Personalizar cronograma</div>
                <div className="text-xs text-muted-foreground">
                  Adapte os focos da semana ao seu cabelo
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Tipo de cabelo
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {HAIR_TYPES.map((h) => (
                    <button
                      key={h}
                      onClick={() => setPrefs((p) => ({ ...p, hair_type: h }))}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-smooth ${prefs.hair_type === h ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Objetivo principal
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {GOALS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setPrefs((p) => ({ ...p, goal: g }))}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-smooth ${prefs.goal === g ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Foco de cada dia
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {DAYS.map((d) => (
                  <div
                    key={d.key}
                    className="rounded-2xl border border-border bg-background/50 p-3"
                  >
                    <div className="text-xs font-bold text-foreground/80">{d.label}</div>
                    <select
                      value={prefs[d.key]}
                      onChange={(e) => updateDayPreference(d.key, parseFocusType(e.target.value))}
                      className="mt-1.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
                    >
                      {focusOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={savePrefs}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition-smooth hover:scale-105 disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar personalização"}
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-full border border-border px-6 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-smooth"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-10 grid grid-cols-3 gap-3 md:gap-4 max-w-2xl">
          {[
            { label: "Sequência", value: "7 dias" },
            { label: "Concluídos", value: `${done.size}` },
            { label: "Nível", value: "Diva ⭐" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-gradient-card border border-border p-4 text-center"
            >
              <div className="text-2xl md:text-3xl font-black text-gradient">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-12 inline-flex rounded-full border border-border bg-card/50 p-1">
          {(["diario", "semanal", "mensal"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-bold capitalize transition-smooth ${tab === t ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-8">
          {tab === "diario" && (
            <div className="grid gap-5 md:grid-cols-3">
              {diario.map((d) => (
                <div
                  key={d.time}
                  className="rounded-3xl bg-gradient-card border border-border p-6 transition-smooth hover:border-primary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                      <d.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {d.time}
                      </div>
                      <div className="font-bold">{d.title}</div>
                    </div>
                  </div>
                  <ul className="mt-5 space-y-2">
                    {d.steps.map((s) => {
                      const k = `d-${d.time}-${s}`;
                      const isDone = done.has(k);
                      return (
                        <li key={s}>
                          <button
                            onClick={() => toggle(k)}
                            className="flex w-full items-center gap-3 text-left text-sm transition-smooth hover:text-foreground"
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-smooth ${isDone ? "bg-gradient-primary border-transparent" : "border-border"}`}
                            >
                              {isDone && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                            </span>
                            <span
                              className={
                                isDone ? "line-through text-muted-foreground" : "text-foreground/90"
                              }
                            >
                              {s}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {tab === "semanal" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {DAYS.map((d) => {
                const type = prefs[d.key] || "Cuidado";
                const meta = FOCUS_TYPES[type] || FOCUS_TYPES["Cuidado"];
                const Icon = meta.icon;
                const k = `s-${d.key}`;
                const isDone = done.has(k);
                return (
                  <button
                    key={d.key}
                    onClick={() => toggle(k)}
                    className={`text-left rounded-3xl bg-gradient-card border p-6 transition-smooth hover:-translate-y-1 ${isDone ? "border-primary shadow-glow" : "border-border hover:border-primary/50"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${meta.color} px-3 py-1 text-xs font-bold text-background`}
                      >
                        <Icon className="h-3.5 w-3.5" /> {type}
                      </div>
                      {isDone && <Check className="h-5 w-5 text-primary" />}
                    </div>
                    <div className="mt-4 text-2xl font-black">{d.label}</div>
                    <p className="mt-2 text-sm text-muted-foreground">{meta.desc}</p>
                  </button>
                );
              })}
            </div>
          )}

          {tab === "mensal" && (
            <div className="grid gap-5 md:grid-cols-2">
              {mensal.map((m) => (
                <div
                  key={m.week}
                  className="rounded-3xl bg-gradient-card border border-border p-7 transition-smooth hover:border-primary/50"
                >
                  <div className="text-xs uppercase tracking-wider text-primary font-bold">
                    {m.week}
                  </div>
                  <div className="mt-1 text-2xl font-black">{m.focus}</div>
                  <ul className="mt-5 space-y-3">
                    {m.tasks.map((t) => {
                      const k = `m-${m.week}-${t}`;
                      const isDone = done.has(k);
                      return (
                        <li key={t}>
                          <button
                            onClick={() => toggle(k)}
                            className="flex w-full items-start gap-3 text-left text-sm"
                          >
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-smooth ${isDone ? "bg-gradient-primary border-transparent" : "border-border"}`}
                            >
                              {isDone && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                            </span>
                            <span className={isDone ? "line-through text-muted-foreground" : ""}>
                              {t}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evolution CTA */}
        <Link
          to="/evolucao"
          className="mt-12 flex items-center gap-4 rounded-3xl bg-gradient-card border border-primary/30 p-6 md:p-8 transition-smooth hover:border-primary hover:-translate-y-0.5"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Camera className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-primary font-bold">
              Acompanhe sua evolução
            </div>
            <p className="mt-1 text-foreground/90">
              Adicione fotos semanais e veja a transformação dos seus fios.
            </p>
          </div>
          <Sparkles className="h-5 w-5 text-primary" />
        </Link>
      </div>
    </div>
  );
}
