import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDiaryEntryByDate,
  listDiaryEntries,
  listDiaryEntriesInRange,
  upsertDiaryEntry,
  type DiaryEntryPayloadShape,
} from "@/services/diary";
import { toast } from "sonner";

function localCivilDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function useDiaryEntryByDate(date: string | Date, enabled = true) {
  const dateKey = typeof date === "string" ? date : localCivilDateKey(date);
  return useQuery({
    queryKey: ["diary", "entry", dateKey],
    queryFn: () => getDiaryEntryByDate(dateKey),
    enabled,
    staleTime: 60_000,
  });
}

export function useDiaryEntriesList(
  { limit = 30, offset = 0 }: { limit?: number; offset?: number } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ["diary", "list", limit, offset],
    queryFn: async () => {
      const rows = await listDiaryEntries(limit, offset);
      return {
        rows,
        hasMore: rows.length === limit,
      };
    },
    enabled,
    staleTime: 60_000,
  });
}

const CIVIL_RANGE_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function useDiaryEntriesInRange(
  { from, to }: { from?: string; to?: string },
  enabled = true,
) {
  const fromOk = typeof from === "string" && CIVIL_RANGE_RE.test(from);
  const toOk = typeof to === "string" && CIVIL_RANGE_RE.test(to);
  const orderOk = fromOk && toOk && from! <= to!;
  return useQuery({
    queryKey: ["diary", "range", from ?? "", to ?? ""],
    queryFn: () => listDiaryEntriesInRange(from!, to!),
    enabled: enabled && fromOk && toOk && orderOk,
    staleTime: 60_000,
  });
}

export function useDiaryUpsertEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ date, payload }: { date: string | Date; payload: DiaryEntryPayloadShape }) => {
      const dateKey = typeof date === "string" ? date : localCivilDateKey(date);
      return upsertDiaryEntry(dateKey, payload);
    },
    onSuccess: async (_, vars) => {
      const dateKey = typeof vars.date === "string" ? vars.date : localCivilDateKey(vars.date);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["diary", "entry", dateKey] }),
        queryClient.invalidateQueries({ queryKey: ["diary", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["diary", "range"] }),
      ]);
      toast.success("Registro salvo com sucesso!");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao salvar o registro.";
      toast.error(msg);
    },
  });
}
