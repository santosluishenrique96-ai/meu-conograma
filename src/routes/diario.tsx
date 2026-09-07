import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BookOpenCheck, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { FeatureAccessGuard } from "@/components/feature-access-guard";
import { useAuth } from "@/hooks/use-auth";
import { useDiaryEntriesList, useDiaryEntryByDate, useDiaryUpsertEntry } from "@/hooks/use-diary";
import { DiaryEntryForm } from "@/components/diary/DiaryEntryForm";
import { DiaryHistory } from "@/components/diary/DiaryHistory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const TAB_FORM = "form";
const TAB_HISTORY = "history";

const CIVIL_DATE_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function validateCivilDateString(raw: string): string | undefined {
  const match = raw.match(CIVIL_DATE_RE);
  if (!match) return undefined;
  const [, yStr, mStr, dStr] = match;
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  const daysInMonth = new Date(y, m, 0).getDate();
  if (d > daysInMonth) return undefined;
  return `${yStr}-${mStr}-${dStr}`;
}

function localCivilDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function civilDateStringToLocalNoon(validatedCivil: string): Date {
  const match = validatedCivil.match(CIVIL_DATE_RE)!;
  const [, yStr, mStr, dStr] = match;
  return new Date(Number(yStr), Number(mStr) - 1, Number(dStr), 12, 0, 0, 0);
}

export const Route = createFileRoute("/diario")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = typeof search.date === "string" ? search.date : undefined;
    if (!raw) return { date: undefined };
    return { date: validateCivilDateString(raw) };
  },
  head: () => ({
    meta: [
      { title: "Diário Capilar — Meu Cronograma" },
      {
        name: "description",
        content:
          "Registre seus tratamentos, acompanhe métricas e veja a evolução dos seus fios dia após dia.",
      },
      { property: "og:title", content: "Diário Capilar — Meu Cronograma" },
      {
        property: "og:description",
        content:
          "Diário capilar: marque o que realizou, perceba o resultado e compare com o planejado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiarioPage,
});

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isLocalDateInFuture(date: Date, today: Date) {
  const a = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const b = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return a.getTime() > b.getTime();
}

function addDays(date: Date, days: number) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function formatHeaderDate(date: Date, isToday: boolean) {
  const long = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  if (isToday) return `Hoje · ${long}`;
  return long;
}

function DiarioPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(12, 0, 0, 0);
    return t;
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (!search.date) return today;
    const candidate = civilDateStringToLocalNoon(search.date);
    if (isLocalDateInFuture(candidate, today)) return today;
    return candidate;
  });

  const [tab, setTab] = useState<string>(TAB_FORM);
  const [page, setPage] = useState(0);

  const enabledEntry = !authLoading && Boolean(user);
  const selectedDateKey = useMemo(() => localCivilDateKey(selectedDate), [selectedDate]);
  const entryByDate = useDiaryEntryByDate(selectedDateKey, enabledEntry);
  const upsertMutation = useDiaryUpsertEntry();

  const listPageSize = 30;
  const listLimit = listPageSize * (page + 1);
  const list = useDiaryEntriesList({ limit: listLimit, offset: 0 }, enabledEntry);

  const isToday = isSameLocalDay(selectedDate, today);
  const isFuture = isLocalDateInFuture(selectedDate, today);

  useEffect(() => {
    const targetKey = search.date ? validateCivilDateString(search.date) : undefined;
    const candidate: Date = targetKey ? civilDateStringToLocalNoon(targetKey) : today;
    const isFutureCandidate = targetKey !== undefined && isLocalDateInFuture(candidate, today);
    const finalDate = isFutureCandidate ? today : candidate;
    const finalKey = localCivilDateKey(finalDate);
    const currentKey = localCivilDateKey(selectedDate);
    if (currentKey !== finalKey) {
      setSelectedDate(finalDate);
    }
  }, [search.date, selectedDate, today]);

  const changeSelectedDate = useCallback(
    (next: Date) => {
      if (isLocalDateInFuture(next, today)) {
        toast.message("Amanhã e datas futuras não podem ser registradas ainda.");
        return;
      }
      const local = new Date(next.getFullYear(), next.getMonth(), next.getDate(), 12, 0, 0, 0);
      const key = localCivilDateKey(local);
      setSelectedDate(local);
      navigate({ to: "/diario", search: (prev) => ({ ...prev, date: key }) });
    },
    [today, navigate],
  );

  const setDate = useCallback((d: Date) => changeSelectedDate(d), [changeSelectedDate]);

  const navYesterday = () => changeSelectedDate(addDays(selectedDate, -1));
  const navTomorrow = () => {
    const next = addDays(selectedDate, +1);
    if (isLocalDateInFuture(next, today)) {
      toast.message("Amanhã e datas futuras estão bloqueadas.");
      return;
    }
    changeSelectedDate(next);
  };
  const backToday = () => changeSelectedDate(today);

  const onSelectFromHistory = useCallback(
    (d: Date) => {
      changeSelectedDate(d);
      setTab(TAB_FORM);
    },
    [changeSelectedDate],
  );

  const onLoadMore = useCallback(async () => {
    setPage((p) => p + 1);
  }, []);

  const loading = authLoading;

  const entriesForHistory = list.data?.rows ?? [];
  const hasMore = Boolean(list.data?.hasMore);

  return (
    <div className="min-h-screen bg-gradient-page">
      <SiteHeader />
      <div className="container mx-auto px-4 py-12 md:py-16 max-w-5xl">
        <FeatureAccessGuard
          featureKey="diario-capilar"
          variant="page"
          title="Diário Capilar"
          description="Registre seus cuidados e acompanhe como seus fios se sentem a cada dia. Desbloqueie esta funcionalidade com o plano Essencial ou Premium."
        >
          <div className="mb-10">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge className="rounded-full bg-gradient-primary/10 border border-primary/30 text-primary-foreground/95 text-foreground">
                <BookOpenCheck className="h-3 w-3 mr-1.5" /> Diário Capilar
              </Badge>
              {isToday ? (
                <Badge variant="outline" className="rounded-full">
                  <Sparkles className="h-3 w-3 mr-1.5 text-primary" />
                  Dia ativo
                </Badge>
              ) : null}
            </div>
            <h1 className="text-4xl md:text-5xl font-black leading-tight">
              Seu <span className="text-gradient">Diário Capilar</span>
            </h1>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              Marque os cuidados realizados, a percepção do resultado e as métricas do dia. Compare
              o planejado com o realizado e acompanhe sua trajetória.
            </p>
          </div>

          <div className="mb-8 flex items-center gap-3 justify-between flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                className="rounded-full shrink-0"
                onClick={navYesterday}
                aria-label="Dia anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-4 py-2 rounded-full border border-border bg-gradient-card text-center min-w-[220px]">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {isToday ? "Registro de hoje" : "Selecionado"}
                </div>
                <div className="font-black text-foreground">
                  {loading ? (
                    <Skeleton className="h-5 w-40 mx-auto my-0.5 inline-block" />
                  ) : (
                    formatHeaderDate(selectedDate, isToday)
                  )}
                </div>
              </div>
              <Button
                size="icon"
                variant="outline"
                className="rounded-full shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={navTomorrow}
                disabled={isFuture || isSameLocalDay(selectedDate, today)}
                aria-label="Próximo dia"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              className="rounded-full w-full sm:w-auto shrink-0"
              onClick={backToday}
              disabled={isToday}
            >
              Voltar para hoje
            </Button>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="rounded-full border border-border bg-card/50 h-auto p-1 mb-8 inline-flex shadow-inner">
              <TabsTrigger
                value={TAB_FORM}
                className="rounded-full px-5 py-2 text-sm font-bold data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow"
              >
                Registro do dia
              </TabsTrigger>
              <TabsTrigger
                value={TAB_HISTORY}
                className="rounded-full px-5 py-2 text-sm font-bold data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow"
              >
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value={TAB_FORM} className="mt-0">
              {entryByDate.error ? (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Não foi possível carregar o registro do dia.</AlertTitle>
                  <AlertDescription className="mt-2 flex items-center gap-2">
                    <span>
                      {(entryByDate.error as Error)?.message ??
                        "Tente novamente em alguns minutos."}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => entryByDate.refetch()}
                    >
                      Tentar novamente
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}
              {isFuture ? (
                <div className="rounded-3xl border-2 border-dashed border-border p-10 text-center bg-gradient-card/50 mb-10">
                  <div className="text-lg font-bold mb-2">
                    Registro para datas futuras não está disponível.
                  </div>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Volte no dia para preencher seu diário. Datas passadas estão disponíveis para
                    registro retroativo.
                  </p>
                </div>
              ) : (
                <DiaryEntryForm
                  selectedDate={selectedDate}
                  entry={entryByDate.data ?? null}
                  isLoadingEntry={entryByDate.isLoading && !entryByDate.data}
                  isFuture={isFuture}
                  isToday={isToday}
                  upsertMutation={upsertMutation}
                />
              )}
            </TabsContent>

            <TabsContent value={TAB_HISTORY} className="mt-0">
              <DiaryHistory
                entries={entriesForHistory}
                isLoading={list.isLoading && !list.data}
                isError={Boolean(list.error)}
                errorMessage={(list.error as Error)?.message ?? null}
                hasMore={hasMore}
                onLoadMore={onLoadMore}
                loadingMore={list.isFetching && page > 0}
                today={today}
                onSelectDate={onSelectFromHistory}
                selectedDate={selectedDate}
                onRetry={() => list.refetch()}
              />
            </TabsContent>
          </Tabs>
        </FeatureAccessGuard>
      </div>
    </div>
  );
}
