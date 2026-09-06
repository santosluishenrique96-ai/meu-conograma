import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDiaryEntryByDate,
  listDiaryEntries,
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
      ]);
      toast.success("Registro salvo com sucesso!");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao salvar o registro.";
      toast.error(msg);
    },
  });
}
