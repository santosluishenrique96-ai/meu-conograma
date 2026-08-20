import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types";

const RUN_INTEGRATION =
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) &&
  (process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY) &&
  process.env.DIARY_TEST_NO_INTEGRATION !== "1";

const SUPABASE_URL_FOR_CLIENT =
  (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) as string;
const SUPABASE_KEY_FOR_CLIENT =
  (process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY) as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

import {
  buildScheduleFocusSnapshot,
  getDiaryEntryByDate,
  listDiaryEntries,
  normalizeISODate,
  upsertDiaryEntry,
  validatePayloadShape,
  validateTreatments,
} from "../src/services/diary";
import type { DiaryTreatment } from "../src/types/diary";
import { supabase as _anonClient } from "../src/integrations/supabase/client";

let supabase: SupabaseClient<Database>;
try {
  void (_anonClient as unknown as { auth: unknown }).auth;
  supabase = _anonClient as SupabaseClient<Database>;
} catch {
  supabase = createClient<Database>(
    SUPABASE_URL_FOR_CLIENT,
    SUPABASE_KEY_FOR_CLIENT,
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

function createSvc(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL_FOR_CLIENT, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const TEST_PASSWORD = `Tst!${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

async function provision(svc: SupabaseClient<Database>): Promise<{ id: string; email: string }> {
  const email =
    `diary-test-${Date.now()}-${Math.floor(Math.random() * 10_000)}@meuconograma.test`;
  const { data, error } = await svc.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  if (!data.user) throw new Error("fail create user");
  return { id: data.user.id, email };
}

async function loginUser(email: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error) throw error;
  return data;
}

async function cleanup(svc: SupabaseClient<Database>, userId: string) {
  try {
    await svc.from("diary_entries").delete().eq("user_id", userId);
  } catch {
    /* ignore */
  }
  try {
    await svc.from("schedule_preferences").delete().eq("user_id", userId);
  } catch {
    /* ignore */
  }
  try {
    await svc.from("user_subscription_state").delete().eq("user_id", userId);
  } catch {
    /* ignore */
  }
  try {
    await svc.auth.admin.deleteUser(userId);
  } catch {
    /* ignore */
  }
  try {
    await supabase.auth.signOut();
  } catch {
    /* ignore */
  }
}

function runStaticTests() {
  console.log("STATIC-1 normalizeISODate UTC");
  const d1 = normalizeISODate("2026-08-09T23:59:59.999Z");
  if (d1 !== "2026-08-09") throw new Error(`normalize err: ${d1}`);

  console.log("STATIC-2 validateTreatments aceita domínio");
  validateTreatments(["Lavagem", "Hidratação", "Outro"] as DiaryTreatment[]);

  console.log("STATIC-3 validateTreatments bloqueia valor inválido");
  let threw = false;
  try {
    validateTreatments(["Banho de barro"] as unknown as DiaryTreatment[]);
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("treatment inválido não bloqueado");

  console.log("STATIC-4 validatePayloadShape bloqueia frizz=0");
  threw = false;
  try {
    validatePayloadShape({ frizz: 0 });
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("escala não validada");

  console.log("STATIC-5 validatePayloadShape bloqueia perceived_result inválido");
  threw = false;
  try {
    validatePayloadShape({ perceived_result: "Fantástico" });
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("resultado inválido não validado");

  console.log("STATIC-6 buildScheduleFocusSnapshot null sem prefs");
  const n = buildScheduleFocusSnapshot(null, new Date("2026-08-09T12:00:00Z"));
  if (n !== null) throw new Error(`esperava null, recebi ${JSON.stringify(n)}`);

  console.log("STATIC-7 buildScheduleFocusSnapshot domingo Nutrição cacheado");
  const sunday = new Date("2026-08-09T12:00:00Z");
  const prefs: {
    sunday: string; monday: string; tuesday: string; wednesday: string; thursday: string;
    friday: string; saturday: string; hair_type: string | null; goal: string | null;
    created_at: string; updated_at: string; id: string; user_id: string;
  } = {
    created_at: "", updated_at: "", id: "", user_id: "",
    monday: "Hidratação", tuesday: "Nutrição", wednesday: "Cuidado",
    thursday: "Reconstrução", friday: "Umectação", saturday: "Finalização", sunday: "Nutrição",
    hair_type: "Cacheado", goal: "Crescimento sem quebra",
  };
  const snap = buildScheduleFocusSnapshot(prefs, sunday);
  if (!snap) throw new Error("snap inexistente");
  if (snap.focus !== "Nutrição" || snap.weekday !== "sunday") {
    throw new Error(`snap focus/weekday errado: ${JSON.stringify(snap)}`);
  }
  if (snap.hair_type !== "Cacheado" || !snap.goal?.includes("Crescimento")) {
    throw new Error(`snap extras errado: ${JSON.stringify(snap)}`);
  }
}

async function provisionFeatureAccessForUser(
  svc: SupabaseClient<Database>,
  userId: string,
  featureKey: string,
) {
  const planQ = await svc.from("subscription_plans").select("id").limit(1);
  const planId = (planQ.data?.[0] as { id: string } | undefined)?.id;
  if (!planId) return;
  try {
    await svc
      .from("subscription_features")
      .insert({ feature_key: featureKey, feature_name: featureKey })
      .throwOnError();
  } catch {
    /* unique violation = já existe */
  }
  try {
    await svc
      .from("plan_feature_access")
      .insert({ plan_id: planId, feature_key: featureKey })
      .throwOnError();
  } catch {
    /* unique violation = já existe */
  }
  try {
    await svc
      .from("user_subscription_state")
      .upsert(
        {
          user_id: userId,
          plan_id: planId,
          status: "active",
          current_period_end: new Date(Date.now() + 86400_000 * 30).toISOString(),
        },
        { onConflict: "user_id" },
      )
      .throwOnError();
  } catch {
    /* ignore */
  }
}

async function runIntegrationTests(userId: string) {
  const svc = createSvc();
  await provisionFeatureAccessForUser(svc, userId, "cronograma-personalizado");
  await provisionFeatureAccessForUser(svc, userId, "diario-capilar");

  console.log("INT-1 getDiaryEntryByDate vazio → null (sem userId na API pública)");
  const empty = await getDiaryEntryByDate("2026-08-09");
  if (empty !== null) throw new Error("não era null");

  console.log("INT-2 criar 2026-08-09");
  const created = await upsertDiaryEntry("2026-08-09", {
    treatments: ["Lavagem", "Hidratação"],
    frizz: 2, dryness: 3, oiliness: 2, definition: 4, shine: 4, breakage: 1,
    perceived_result: "Bom", note: "Cabelo macio",
  });
  if (!created.id) throw new Error("sem id");
  if (created.entry_date !== "2026-08-09") throw new Error("entry_date errado");
  if (created.treatments.join(",") !== "Lavagem,Hidratação") throw new Error("treatments errado");
  if (created.user_id !== userId) throw new Error("user_id errado (não bate com sessão)");

  console.log("INT-3 editar mesma data não duplica, preserva treatments");
  const edited = await upsertDiaryEntry("2026-08-09", { definition: 5, note: "atualizado" });
  if (edited.id !== created.id) throw new Error("id mudou → duplicou");
  if (edited.definition !== 5) throw new Error("definition não atualizou");
  if (edited.treatments.join(",") !== "Lavagem,Hidratação") throw new Error("treatments caiu");

  console.log("INT-4 criar 2026-08-10 (segunda data)");
  const day2 = await upsertDiaryEntry("2026-08-10", { treatments: ["Umectação"], shine: 5 });
  if (day2.entry_date !== "2026-08-10") throw new Error("dia errado");

  console.log("INT-5 contagem real: 2026-08-09 tem 1 registro");
  const cntRes = await svc
    .from("diary_entries")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .eq("entry_date", "2026-08-09");
  if (cntRes.error) throw cntRes.error;
  const count = cntRes.data?.length ?? 0;
  if (count !== 1) throw new Error(`contagem errada: ${count} (${JSON.stringify(cntRes.data)})`);

  console.log("INT-6 listDiaryEntries desc 10/09 (sem userId)");
  const list = await listDiaryEntries(2);
  if (list.length !== 2) throw new Error(`list len ${list.length}`);
  if (list[0].entry_date !== "2026-08-10" || list[1].entry_date !== "2026-08-09") {
    throw new Error("ordem errada");
  }

  console.log("INT-7 paginação (1,1) retorna só 08-09");
  const paged = await listDiaryEntries(1, 1);
  if (paged.length !== 1 || paged[0].entry_date !== "2026-08-09") {
    throw new Error(`paginação quebrada: ${JSON.stringify(paged)}`);
  }

  console.log("INT-8 buscar por 2026-08-10 bate com day2.id");
  const byDate = await getDiaryEntryByDate("2026-08-10");
  if (!byDate || byDate.id !== day2.id) throw new Error("busca por data quebrada");

  console.log("INT-9 snapshot NULL quando não há schedule_preferences");
  if (created.scheduled_focus_snapshot !== null) {
    throw new Error(`snapshot não era null: ${JSON.stringify(created.scheduled_focus_snapshot)}`);
  }

  console.log("INT-10 insere schedule_preferences (service role) + feature acesso → snapshot JSONB gravado (objeto)");
  {
    const up = await svc
      .from("schedule_preferences")
      .upsert(
        {
          user_id: userId,
          hair_type: "Cacheado",
          goal: "Crescimento sem quebra",
          monday: "Hidratação",
          tuesday: "Nutrição",
          wednesday: "Cuidado",
          thursday: "Reconstrução",
          friday: "Umectação",
          saturday: "Finalização",
          sunday: "Nutrição",
        },
        { onConflict: "user_id" },
      );
    if (up.error) throw up.error;
  }
  const refreshed = await upsertDiaryEntry("2026-08-09", { note: "com schedule" });
  if (!refreshed.scheduled_focus_snapshot) throw new Error("snapshot não gravado");
  const r = refreshed.scheduled_focus_snapshot as unknown as {
    focus: string; weekday: string; hair_type?: string; goal?: string;
  };
  if (r.focus !== "Nutrição" || r.weekday !== "sunday") {
    throw new Error(`snapshot focus/weekday errado: ${JSON.stringify(r)}`);
  }
  if (r.hair_type !== "Cacheado" || !r.goal?.includes("Crescimento")) {
    throw new Error(`snapshot extras errado: ${JSON.stringify(r)}`);
  }

  console.log("INT-11 edição não sobrescreve campos silenciosos");
  if (refreshed.definition !== 5) throw new Error("definition caiu");
  if (refreshed.treatments.join(",") !== "Lavagem,Hidratação") throw new Error("treatments caiu");
  if (!refreshed.note?.includes("com schedule")) throw new Error("note não atualizou");

  console.log("INT-12 service bloqueia treatment fora do domínio (não chega ao banco)");
  let threw = false;
  try {
    await upsertDiaryEntry("2026-08-11", {
      treatments: ["Botox"] as unknown as DiaryTreatment[],
    });
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("não bloqueou treatment inválido");
}

async function main() {
  runStaticTests();
  if (!RUN_INTEGRATION) {
    console.log("DIARY_SERVICE_STATIC_OK (integração pulada — informe SUPABASE_SERVICE_ROLE_KEY e VITE_SUPABASE_* para rodar tudo)");
    return;
  }
  const svc = createSvc();
  const user = await provision(svc);
  try {
    await loginUser(user.email);
    const { data: who } = await supabase.auth.getUser();
    if (who.user?.id !== user.id) {
      throw new Error("sessão autenticada com user errado");
    }
    await runIntegrationTests(user.id);
  } finally {
    await cleanup(svc, user.id);
  }
  const svc2 = createSvc();
  const { count: left } = await svc2
    .from("diary_entries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (left !== 0) throw new Error(`limpeza falhou, sobraram ${left}`);
  console.log("DIARY_SERVICE_TESTS_OK");
}

main().catch((e) => {
  console.error("DIARY_SERVICE_TESTS_FAILED", e);
  process.exit(1);
});

export {};
