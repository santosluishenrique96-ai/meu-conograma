import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
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
  ClipboardList,
  WandSparkles,
  Target,
  RefreshCw,
  ShoppingBag,
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
const CORE_FOCUS = ["Hidratação", "Nutrição", "Reconstrução"] as const;

type CoreFocusType = (typeof CORE_FOCUS)[number];
type HairGoal = (typeof GOALS)[number];

type FocusScore = Record<CoreFocusType, number>;
type Concern = {
  key: string;
  label: string;
  desc: string;
  focus: CoreFocusType;
  weight: number;
  tip: string;
};

type QuizOption = {
  key: string;
  label: string;
  desc: string;
  scores: Partial<FocusScore>;
};

type QuizQuestion = {
  key: string;
  question: string;
  helper: string;
  options: QuizOption[];
};

type ProductRecommendation = {
  focus: CoreFocusType;
  name: string;
  subtitle: string;
  whenToUse: string;
  benefits: string[];
};

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

const CONCERNS: Concern[] = [
  {
    key: "secura",
    label: "Ressecado e sem maciez",
    desc: "Fio áspero, armado e com toque seco.",
    focus: "Hidratação",
    weight: 3,
    tip: "Priorize máscaras com babosa, pantenol e glicerina para devolver água aos fios.",
  },
  {
    key: "opacidade",
    label: "Sem brilho",
    desc: "Cabelo opaco e sem vida mesmo limpo.",
    focus: "Hidratação",
    weight: 2,
    tip: "Finalize com leave-in leve e aposte em hidratações de selagem para refletir mais luz.",
  },
  {
    key: "frizz",
    label: "Frizz e volume excessivo",
    desc: "Fios desalinhados e difíceis de controlar.",
    focus: "Nutrição",
    weight: 3,
    tip: "Nutrição com óleos e manteigas ajuda a alinhar cutículas e reduzir o arrepiado.",
  },
  {
    key: "pontas",
    label: "Pontas espigadas",
    desc: "Pontas ásperas, porosas ou abrindo com facilidade.",
    focus: "Nutrição",
    weight: 2,
    tip: "Use umectação nas pontas e selagem com finalizador nutritivo para proteger o comprimento.",
  },
  {
    key: "quebra",
    label: "Quebra com facilidade",
    desc: "Fio parte no pentear, desembaraçar ou lavar.",
    focus: "Reconstrução",
    weight: 3,
    tip: "Reconstrução entra em cena com queratina, aminoácidos e proteínas em intervalo controlado.",
  },
  {
    key: "emborrachado",
    label: "Elástico ou emborrachado",
    desc: "Quando molhado, estica demais e não volta.",
    focus: "Reconstrução",
    weight: 4,
    tip: "Evite excesso de química e faça uma reconstrução seguida de hidratação para equilibrar.",
  },
];

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    key: "feel",
    question: "Como seu cabelo fica ao toque depois de seco?",
    helper: "Esse sinal mostra a necessidade mais urgente do fio.",
    options: [
      {
        key: "rough",
        label: "Áspero e seco",
        desc: "Perde maciez rápido e parece pedir água toda hora.",
        scores: { Hidratação: 3, Nutrição: 1 },
      },
      {
        key: "frizzy",
        label: "Macio, mas com frizz",
        desc: "Falta alinhamento e proteção lipídica.",
        scores: { Nutrição: 3, Hidratação: 1 },
      },
      {
        key: "fragile",
        label: "Mole ou frágil",
        desc: "Pode indicar perda de massa e fibra sensibilizada.",
        scores: { Reconstrução: 3, Hidratação: 1 },
      },
    ],
  },
  {
    key: "wash",
    question: "O que acontece logo após a lavagem?",
    helper: "Observe como o fio responde nas primeiras horas.",
    options: [
      {
        key: "dries_fast",
        label: "Resseca rápido",
        desc: "Mesmo com creme, perde maciez em pouco tempo.",
        scores: { Hidratação: 2, Nutrição: 1 },
      },
      {
        key: "poofy",
        label: "Arma e arrepia",
        desc: "Fica volumoso e sem definição.",
        scores: { Nutrição: 3 },
      },
      {
        key: "breaks",
        label: "Fica frágil",
        desc: "Quebra ou estica demais ao desembaraçar.",
        scores: { Reconstrução: 3 },
      },
    ],
  },
  {
    key: "chemistry",
    question: "Seu cabelo passou por química, calor frequente ou descoloração?",
    helper: "Isso altera bastante a força e a regularidade do cronograma.",
    options: [
      {
        key: "none",
        label: "Quase nunca",
        desc: "Pouca agressão química ou térmica.",
        scores: { Hidratação: 1, Nutrição: 1 },
      },
      {
        key: "sometimes",
        label: "Às vezes",
        desc: "Secador, chapinha ou química pontual.",
        scores: { Nutrição: 2, Reconstrução: 1 },
      },
      {
        key: "often",
        label: "Com frequência",
        desc: "Coloração, alisamento, calor intenso ou descoloração.",
        scores: { Reconstrução: 3, Nutrição: 1 },
      },
    ],
  },
  {
    key: "goal",
    question: "Qual resultado você mais quer perceber nas próximas semanas?",
    helper: "Esse desejo ajuda a ajustar o foco principal da rotina.",
    options: [
      {
        key: "shine",
        label: "Mais brilho e maciez",
        desc: "Fio soltinho, leve e com toque sedoso.",
        scores: { Hidratação: 2 },
      },
      {
        key: "alignment",
        label: "Menos frizz e mais definição",
        desc: "Cutículas mais seladas e aspecto alinhado.",
        scores: { Nutrição: 2 },
      },
      {
        key: "strength",
        label: "Menos quebra e mais força",
        desc: "Fibra resistente para recuperar danos.",
        scores: { Reconstrução: 2 },
      },
    ],
  },
];

const PRODUCT_RECOMMENDATIONS: Record<CoreFocusType, ProductRecommendation> = {
  Hidratação: {
    focus: "Hidratação",
    name: "Kit Hidratação Gloss",
    subtitle: "Maciez intensa e brilho imediato",
    whenToUse: "Ideal quando o cabelo está opaco, áspero ou perdendo maciez rápido.",
    benefits: [
      "Ajuda a devolver água e maleabilidade aos fios",
      "Combina bem com fases de brilho e toque sedoso",
      "Funciona como base segura para começar o cronograma",
    ],
  },
  Nutrição: {
    focus: "Nutrição",
    name: "Kit Nutrição Power Oils",
    subtitle: "Controle de frizz e nutrição profunda",
    whenToUse: "Indicado para cabelos com frizz, pontas secas e dificuldade de alinhamento.",
    benefits: [
      "Ajuda a selar o fio e reduzir arrepiado",
      "Melhora definição, brilho e proteção do comprimento",
      "Muito útil em cabelos porosos ou com pontas espigadas",
    ],
  },
  Reconstrução: {
    focus: "Reconstrução",
    name: "Kit Reconstrução Expert",
    subtitle: "Força, elasticidade e reparo",
    whenToUse: "Perfeito quando o fio quebra, estica demais ou sofreu química e calor frequente.",
    benefits: [
      "Reposição de massa para cabelos fragilizados",
      "Ajuda a devolver resistência e elasticidade",
      "Ideal para usar com intervalo e apoio de hidratação",
    ],
  },
};

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

function createEmptyScores(): FocusScore {
  return {
    Hidratação: 0,
    Nutrição: 0,
    Reconstrução: 0,
  };
}

function addPartialScores(target: FocusScore, partial: Partial<FocusScore>) {
  CORE_FOCUS.forEach((focus) => {
    target[focus] += partial[focus] ?? 0;
  });
}

function getGoalFromRanking(topFocus: CoreFocusType, secondFocus: CoreFocusType): HairGoal {
  if (topFocus === "Reconstrução") return "Recuperar danificados";
  if (topFocus === "Nutrição") return "Reduzir frizz";
  if (topFocus === "Hidratação" && secondFocus === "Reconstrução") return "Crescimento";
  if (topFocus === "Hidratação") return "Brilho";
  return "Manutenção";
}

function buildWeeklyPlan(ranking: CoreFocusType[], scores: FocusScore): Record<DayKey, FocusType> {
  const [topFocus, secondFocus, thirdFocus] = ranking;
  const needsIntensiveRepair = scores.Reconstrução >= 5;

  return {
    monday: topFocus,
    tuesday: "Descanso",
    wednesday: topFocus === "Reconstrução" ? "Hidratação" : secondFocus,
    thursday: "Descanso",
    friday: topFocus === "Nutrição" ? "Hidratação" : topFocus,
    saturday: needsIntensiveRepair ? "Reconstrução" : thirdFocus,
    sunday: "Cuidado",
  };
}

function buildMonthlyGuide(ranking: CoreFocusType[]) {
  const [topFocus, secondFocus, thirdFocus] = ranking;

  return [
    {
      week: "Semana 1",
      focus: `${topFocus} de recuperação`,
      tasks: [
        `Faça 1 tratamento de ${topFocus.toLowerCase()} com tempo completo de pausa`,
        "Fotografe o antes para comparar textura, brilho e definição",
        "Observe como o cabelo responde 48 horas depois",
      ],
    },
    {
      week: "Semana 2",
      focus: `${secondFocus} para equilíbrio`,
      tasks: [
        `Inclua um cuidado de ${secondFocus.toLowerCase()} para completar a fibra`,
        "Ajuste a quantidade de produto para não pesar o fio",
        "Anote se o frizz, toque ou elasticidade melhoraram",
      ],
    },
    {
      week: "Semana 3",
      focus: `Manutenção com ${topFocus.toLowerCase()}`,
      tasks: [
        `Repita o foco principal em ${topFocus.toLowerCase()} para consolidar o resultado`,
        "Capriche na finalização e proteção térmica",
        "Reavalie pontas, brilho e maleabilidade",
      ],
    },
    {
      week: "Semana 4",
      focus: `Fechamento com ${thirdFocus.toLowerCase()}`,
      tasks: [
        `Use ${thirdFocus.toLowerCase()} para fechar o ciclo com equilíbrio`,
        "Faça uma lavagem mais cuidadosa e finalize com sérum ou óleo leve",
        "Defina o próximo mês com base no que mais evoluiu",
      ],
    },
  ];
}

function buildDiagnosis(selectedConcerns: string[], answers: Record<string, string>) {
  const scores = createEmptyScores();
  const selectedConcernItems = CONCERNS.filter((concern) => selectedConcerns.includes(concern.key));

  selectedConcernItems.forEach((concern) => {
    scores[concern.focus] += concern.weight;
  });

  QUIZ_QUESTIONS.forEach((question) => {
    const option = question.options.find((item) => item.key === answers[question.key]);
    if (option) addPartialScores(scores, option.scores);
  });

  if (Object.values(scores).every((value) => value === 0)) {
    scores.Hidratação = 2;
    scores.Nutrição = 2;
    scores.Reconstrução = 1;
  }

  const ranking = [...CORE_FOCUS].sort((a, b) => scores[b] - scores[a]);
  const [topFocus, secondFocus] = ranking;
  const recommendedGoal = getGoalFromRanking(topFocus, secondFocus);
  const weeklyPlan = buildWeeklyPlan(ranking, scores);
  const monthlyGuide = buildMonthlyGuide(ranking);
  const highlightedTips = [
    ...selectedConcernItems.slice(0, 3).map((concern) => concern.tip),
    `Seu cronograma ideal agora é liderado por ${topFocus.toLowerCase()}, com apoio de ${secondFocus.toLowerCase()} para equilibrar os fios.`,
  ].slice(0, 4);

  const summaryByFocus: Record<CoreFocusType, string> = {
    Hidratação: "Seu cabelo está pedindo mais reposição de água, maciez e brilho.",
    Nutrição: "Seu fio precisa de mais nutrição para alinhar, reduzir frizz e segurar definição.",
    Reconstrução: "A fibra mostra sinais de fragilidade e merece reconstrução com mais cuidado.",
  };

  return {
    scores,
    ranking,
    recommendedGoal,
    weeklyPlan,
    monthlyGuide,
    highlightedTips,
    summary: summaryByFocus[topFocus],
  };
}

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
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

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

  const diagnosis = useMemo(
    () => buildDiagnosis(selectedConcerns, quizAnswers),
    [quizAnswers, selectedConcerns],
  );
  const recommendedProducts = useMemo(
    () =>
      diagnosis.ranking.map((focus, index) => ({
        ...PRODUCT_RECOMMENDATIONS[focus],
        priorityLabel:
          index === 0
            ? "Mais indicado agora"
            : index === 1
              ? "Complementa seu tratamento"
              : "Apoio para equilíbrio",
      })),
    [diagnosis.ranking],
  );

  const answeredQuestions = Object.keys(quizAnswers).length;

  const savePrefs = async (nextPrefs: Prefs = prefs) => {
    if (!user) {
      toast.error("Faça login para salvar sua personalização");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("schedule_preferences")
      .upsert({ user_id: user.id, ...nextPrefs }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error("Erro ao salvar");
    else {
      toast.success("Cronograma personalizado!");
      setShowSettings(false);
      setPrefs(nextPrefs);
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

  const toggleConcern = (concernKey: string) => {
    setSelectedConcerns((prev) =>
      prev.includes(concernKey)
        ? prev.filter((item) => item !== concernKey)
        : [...prev, concernKey],
    );
  };

  const answerQuiz = (questionKey: string, optionKey: string) => {
    setQuizAnswers((prev) => ({ ...prev, [questionKey]: optionKey }));
  };

  const applySuggestedRoutine = () => {
    const nextPrefs: Prefs = {
      ...prefs,
      goal: diagnosis.recommendedGoal,
      ...diagnosis.weeklyPlan,
    };
    setPrefs(nextPrefs);
    setShowSettings(true);
    toast.success("Sugestão aplicada. Revise e salve sua personalização.");
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

        <div className="mt-8 rounded-3xl border border-primary/30 bg-gradient-card p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <ClipboardList className="h-3.5 w-3.5" /> Diagnóstico guiado
              </span>
              <h2 className="mt-4 text-2xl font-black md:text-3xl">
                Descubra o que seu cabelo está pedindo agora
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Marque os sinais que você percebe e responda ao teste capilar. A tela interpreta os
                sintomas, explica o motivo e sugere um cronograma mais próximo do ideal para os seus
                fios.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Teste concluído
              </div>
              <div className="mt-1 text-2xl font-black text-gradient">
                {answeredQuestions}/{QUIZ_QUESTIONS.length}
              </div>
              <div className="text-xs text-muted-foreground">perguntas respondidas</div>
            </div>
          </div>

          <div className="mt-8">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              1. Marque o que você percebe no seu cabelo hoje
            </label>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {CONCERNS.map((concern) => {
                const isSelected = selectedConcerns.includes(concern.key);
                const meta = FOCUS_TYPES[concern.focus];
                const Icon = meta.icon;

                return (
                  <button
                    key={concern.key}
                    type="button"
                    onClick={() => toggleConcern(concern.key)}
                    className={`rounded-2xl border p-4 text-left transition-smooth ${isSelected ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-background/40 hover:border-primary/50"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${meta.color} px-3 py-1 text-xs font-bold text-background`}
                      >
                        <Icon className="h-3.5 w-3.5" /> {concern.focus}
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="mt-3 font-bold">{concern.label}</div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {concern.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              2. Faça seu teste capilar rápido
            </label>
            <div className="mt-3 grid gap-4 xl:grid-cols-2">
              {QUIZ_QUESTIONS.map((question) => (
                <div
                  key={question.key}
                  className="rounded-2xl border border-border bg-background/40 p-4"
                >
                  <div className="font-bold">{question.question}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{question.helper}</p>
                  <div className="mt-4 space-y-2">
                    {question.options.map((option) => {
                      const isSelected = quizAnswers[question.key] === option.key;

                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => answerQuiz(question.key, option.key)}
                          className={`w-full rounded-2xl border p-3 text-left transition-smooth ${isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold">{option.label}</div>
                              <div className="mt-1 text-sm text-muted-foreground">
                                {option.desc}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-primary/30 bg-background/50 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                  <WandSparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-bold">Sua leitura capilar</div>
                  <div className="text-xs text-muted-foreground">
                    Resultado pensado a partir dos sinais e respostas do teste
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {diagnosis.ranking.map((focus) => (
                  <div key={focus} className="rounded-2xl border border-border bg-card/60 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {focus}
                    </div>
                    <div className="mt-2 text-3xl font-black text-gradient">
                      {diagnosis.scores[focus]}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">pontos de prioridade</div>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-sm leading-relaxed text-foreground/90">{diagnosis.summary}</p>

              <div className="mt-5 rounded-2xl border border-border bg-card/50 p-4">
                <div className="inline-flex items-center gap-2 text-sm font-bold text-primary">
                  <Target className="h-4 w-4" /> Objetivo sugerido
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  O sistema recomenda focar em{" "}
                  <strong className="text-foreground">{diagnosis.recommendedGoal}</strong> neste
                  momento, porque esse caminho conversa melhor com os sinais que seu cabelo está
                  mostrando.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={applySuggestedRoutine}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition-smooth hover:scale-105"
                >
                  <RefreshCw className="h-4 w-4" /> Aplicar sugestão ao cronograma
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="rounded-full border border-border px-6 py-2.5 text-sm font-bold text-muted-foreground transition-smooth hover:border-primary hover:text-primary"
                >
                  Revisar manualmente
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-background/50 p-6">
              <div className="font-bold">Dicas para chegar no cronograma ideal</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Use estas observações como guia enquanto ajusta sua rotina.
              </div>
              <ul className="mt-5 space-y-3">
                {diagnosis.highlightedTips.map((tip) => (
                  <li key={tip} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="leading-relaxed text-foreground/90">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-border bg-background/50 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                  <ShoppingBag className="h-3.5 w-3.5" /> Produtos indicados
                </span>
                <h3 className="mt-4 text-2xl font-black">
                  O que usar para seguir seu cronograma com mais clareza
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Separei os kits que mais combinam com o seu diagnóstico atual para facilitar a
                  escolha entre hidratação, nutrição e reconstrução.
                </p>
              </div>
              <Link
                to="/produtos"
                search={{ focus: undefined }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-5 py-3 text-sm font-bold transition-smooth hover:border-primary hover:text-primary"
              >
                Ver todos os produtos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              {recommendedProducts.map((product) => {
                const meta = FOCUS_TYPES[product.focus];
                const Icon = meta.icon;

                return (
                  <div
                    key={product.focus}
                    className="rounded-3xl border border-border bg-card/60 p-5 transition-smooth hover:border-primary/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${meta.color} px-3 py-1 text-xs font-bold text-background`}
                      >
                        <Icon className="h-3.5 w-3.5" /> {product.focus}
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {product.priorityLabel}
                      </span>
                    </div>

                    <div className="mt-4 text-lg font-black">{product.name}</div>
                    <p className="mt-1 text-sm font-medium text-foreground/90">
                      {product.subtitle}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {product.whenToUse}
                    </p>

                    <ul className="mt-4 space-y-2">
                      {product.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-3 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="leading-relaxed text-foreground/90">{benefit}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      to="/produtos"
                      search={{ focus: product.focus }}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow transition-smooth hover:scale-105"
                    >
                      Adicionar esse kit ao meu tratamento <ArrowRight className="h-4 w-4" />
                    </Link>

                    <Link
                      to="/produtos"
                      search={{ focus: product.focus }}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary transition-smooth hover:gap-3"
                    >
                      Abrir vitrine de produtos <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
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
                <p className="mt-3 text-xs text-muted-foreground">
                  Sugestão atual do teste:{" "}
                  <span className="font-semibold text-foreground">{diagnosis.recommendedGoal}</span>
                </p>
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
                onClick={() => savePrefs()}
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
              {diagnosis.monthlyGuide.map((m) => (
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
