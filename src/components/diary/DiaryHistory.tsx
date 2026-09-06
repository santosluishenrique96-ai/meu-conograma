import { useMemo, useState } from "react";
import { AlertCircle, CalendarCheck, CalendarDays, ChevronsDown, Loader2 } from "lucide-react";
import type { DiaryEntryRow } from "@/types/diary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DiaryEntryCard } from "@/components/diary/DiaryEntryCard";
import { DayButton } from "react-day-picker";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export interface DiaryHistoryProps {
  entries: DiaryEntryRow[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
  today: Date;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  onRetry: () => void;
  className?: string;
}

const TAB_CALENDAR = "calendar";
const TAB_LIST = "list";

export function DiaryHistory({
  entries,
  isLoading,
  isError,
  errorMessage,
  hasMore,
  onLoadMore,
  loadingMore,
  today,
  onSelectDate,
  selectedDate,
  onRetry,
  className,
}: DiaryHistoryProps) {
  const [tab, setTab] = useState<string>(TAB_CALENDAR);

  const disabledDates = useMemo(() => {
    const tomorrow = new Date(today);
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const maxYear = new Date(today);
    maxYear.setFullYear(maxYear.getFullYear() + 5);
    return {
      from: tomorrow,
      to: maxYear,
    };
  }, [today]);

  const markedSet = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      set.add(e.entry_date);
    }
    return set;
  }, [entries]);

  const modifiersStyles = useMemo(
    () => ({
      daysWithEntry: {
        fontWeight: 700,
      },
    }),
    [],
  );

  const isToday = (d: Date) => {
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return t.getTime() === x.getTime();
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h3 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Histórico
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Registros recentes. Clique em um dia para editar.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {entries.length} registro{entries.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="rounded-full border border-border bg-card/50 h-auto p-1 mb-6 inline-flex shadow-inner">
          <TabsTrigger
            value={TAB_CALENDAR}
            className="rounded-full px-5 py-2 text-sm font-bold data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow"
          >
            <CalendarCheck className="h-3.5 w-3.5 mr-1.5 inline-block" /> Calendário
          </TabsTrigger>
          <TabsTrigger
            value={TAB_LIST}
            className="rounded-full px-5 py-2 text-sm font-bold data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow"
          >
            Últimos dias
          </TabsTrigger>
        </TabsList>

        {isError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Não foi possível carregar o histórico.</AlertTitle>
            <AlertDescription className="flex items-center gap-2 mt-2">
              <span>{errorMessage ?? "Tente novamente em breve."}</span>
              <Button size="sm" variant="outline" className="rounded-full" onClick={onRetry}>
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <TabsContent value={TAB_CALENDAR} className="mt-0">
          <div className="rounded-3xl bg-gradient-card border border-border p-5 md:p-8 shadow-elegant mx-auto w-fit max-w-full overflow-x-auto">
            {isLoading ? (
              <Skeleton className="h-[320px] w-[320px] md:h-[360px] md:w-[400px] rounded-2xl" />
            ) : (
              <>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && onSelectDate(d)}
                  disabled={disabledDates}
                  today={today}
                  defaultMonth={selectedDate}
                  modifiers={{
                    daysWithEntry: (date) => {
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, "0");
                      const d = String(date.getDate()).padStart(2, "0");
                      return markedSet.has(`${y}-${m}-${d}`);
                    },
                    isToday: (d) => isToday(d),
                  }}
                  modifiersStyles={modifiersStyles}
                  components={{
                    DayButton: ({ day, ...props }: ComponentPropsWithoutRef<typeof DayButton>) => {
                      const date = day.date;
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, "0");
                      const d = String(date.getDate()).padStart(2, "0");
                      const key = `${y}-${m}-${d}`;
                      const hasEntry = markedSet.has(key);
                      const today_ = isToday(date);
                      return (
                        <button
                          {...props}
                          className={cn(
                            props.className,
                            "relative",
                            hasEntry &&
                              "after:content-[''] after:absolute after:-bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
                            today_ && "ring-2 ring-primary ring-offset-1",
                          )}
                        />
                      );
                    },
                  }}
                  classNames={{
                    day_button: cn(
                      "aria-selected:bg-gradient-primary aria-selected:text-primary-foreground aria-selected:shadow-glow h-8 w-8 md:h-9 md:w-9 rounded-md",
                    ),
                    cell: "h-9 w-9 md:h-10 md:w-10 p-0",
                  }}
                  locale={undefined}
                  formatters={{
                    formatWeekdayName: (date) =>
                      new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
                        .format(date)
                        .replace(".", "")
                        .charAt(0)
                        .toUpperCase() +
                      new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
                        .format(date)
                        .replace(".", "")
                        .slice(1),
                    formatCaption: (date) =>
                      date.toLocaleDateString("pt-BR", {
                        month: "long",
                        year: "numeric",
                      }),
                  }}
                  numberOfMonths={1}
                />
                <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card/60 text-xs">
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                    </span>
                    <span>Dia com registro</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md ring-2 ring-primary ring-offset-1 bg-card/60 text-xs">
                      06
                    </span>
                    <span>Hoje</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground/60 bg-card/30 text-xs cursor-not-allowed">
                      31
                    </span>
                    <span>Futuro (bloqueado)</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value={TAB_LIST} className="mt-0">
          {isLoading ? (
            <div className="grid gap-5 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-[220px] rounded-3xl border border-border bg-gradient-card/70"
                />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-border p-10 text-center bg-gradient-card/50">
              <CalendarCheck className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
              <div className="text-lg font-bold mb-2">Nenhum registro ainda.</div>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
                Comece preenchendo o diário com os cuidados de hoje e volte aqui para consultar o
                histórico.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                {entries.map((entry) => (
                  <DiaryEntryCard
                    key={entry.entry_date}
                    entry={entry}
                    onEdit={(entryDate) => {
                      const [y, m, d] = entryDate.split("-").map((n) => parseInt(n, 10));
                      const dt = new Date(y, m - 1, d);
                      onSelectDate(dt);
                    }}
                  />
                ))}
              </div>
              {hasMore ? (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    ) : (
                      <ChevronsDown className="h-3.5 w-3.5 mr-2" />
                    )}
                    {loadingMore ? "Carregando..." : "Carregar mais 30 dias"}
                  </Button>
                </div>
              ) : entries.length > 0 ? (
                <div className="flex justify-center pt-2">
                  <Badge variant="outline" className="rounded-full">
                    Início do histórico
                  </Badge>
                </div>
              ) : null}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
