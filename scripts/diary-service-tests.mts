import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types";

const SUPABASE_URL_FOR_CLIENT =
  (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) as string | undefined;
const SUPABASE_KEY_FOR_CLIENT =
  (process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY) as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as
  | string
  | undefined;

const hasSupabaseIntegrationEnv =
  Boolean(SUPABASE_URL_FOR_CLIENT) &&
  Boolean(SUPABASE_KEY_FOR_CLIENT) &&
  Boolean(SUPABASE_SERVICE_ROLE_KEY);

const RUN_INTEGRATION =
  hasSupabaseIntegrationEnv && process.env.DIARY_TEST_NO_INTEGRATION !== "1";

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

let supabase: SupabaseClient<Database> | undefined;

if (RUN_INTEGRATION) {
  if (hasSupabaseIntegrationEnv) {
    try {
      // Import adia o side effect de inicialização só quando realmente há credenciais.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { supabase: _anonClient } = require("../src/integrations/supabase/client") as {
        supabase: unknown;
      };
      void (_anonClient as { auth: unknown }).auth;
      supabase = _anonClient as SupabaseClient<Database>;
    } catch {
      supabase = createClient<Database>(
        SUPABASE_URL_FOR_CLIENT as string,
        SUPABASE_KEY_FOR_CLIENT as string,
        {
          auth: {
            storage: undefined,
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );
    }
  }
}

function createSvc(): SupabaseClient<Database> {
  if (!hasSupabaseIntegrationEnv) {
    throw new Error("createSvc: credenciais Supabase não disponíveis");
  }
  return createClient<Database>(
    SUPABASE_URL_FOR_CLIENT as string,
    SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
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
  console.log("STATIC-1 normalizeISODate data civil literal YYYY-MM-DD");
  const d1a = normalizeISODate("2026-08-09");
  if (d1a !== "2026-08-09") throw new Error(`normalize err literal: ${d1a}`);

  console.log("STATIC-1B normalizeISODate Date LOCAL 23:59:59.999 (virada fuso local não desloca dia)");
  const d1bDate = new Date(2026, 7, 9, 23, 59, 59, 999);
  const d1b = normalizeISODate(d1bDate);
  if (d1b !== "2026-08-09") throw new Error(`normalize err local 23:59: ${d1b}`);

  console.log("STATIC-1C normalizeISODate REJEITA datetime strings com T/Z (contrato 2B)");
  let threwDatetimeString = false;
  try {
    normalizeISODate("2026-08-09T23:59:59.999Z");
  } catch {
    threwDatetimeString = true;
  }
  if (!threwDatetimeString) throw new Error("datetime ISO com T/Z deveria ter sido rejeitado");

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

  console.log("STATIC-6 buildScheduleFocusSnapshot prefs null usa DEFAULT do cronograma (domingo = Cuidado)");
  const sunday = new Date("2026-08-09T12:00:00Z");
  const n = buildScheduleFocusSnapshot(null, sunday);
  if (!n) throw new Error(`esperava snapshot fallback, recebi null`);
  if (n.weekday !== "sunday" || n.focus !== "Cuidado") {
    throw new Error(`snapshot default domingo errado: ${JSON.stringify(n)}`);
  }
  if (n.hair_type !== undefined && n.hair_type !== null) {
    throw new Error(`hair_type não deve existir no fallback default: ${JSON.stringify(n)}`);
  }
  if (n.goal !== undefined && n.goal !== null) {
    throw new Error(`goal não deve existir no fallback default: ${JSON.stringify(n)}`);
  }

  console.log("STATIC-7 buildScheduleFocusSnapshot domingo Nutrição cacheado");
  const sundayPrefs: {
    sunday: string; monday: string; tuesday: string; wednesday: string; thursday: string;
    friday: string; saturday: string; hair_type: string | null; goal: string | null;
  } = {
    monday: "Hidratação", tuesday: "Nutrição", wednesday: "Cuidado",
    thursday: "Reconstrução", friday: "Umectação", saturday: "Finalização", sunday: "Nutrição",
    hair_type: "Cacheado", goal: "Crescimento sem quebra",
  };
  const snap = buildScheduleFocusSnapshot(sundayPrefs, sunday);
  if (!snap) throw new Error("snap inexistente");
  if (snap.focus !== "Nutrição" || snap.weekday !== "sunday") {
    throw new Error(`snap focus/weekday errado: ${JSON.stringify(snap)}`);
  }
  if (snap.hair_type !== "Cacheado" || !snap.goal?.includes("Crescimento")) {
    throw new Error(`snap extras errado: ${JSON.stringify(snap)}`);
  }

  console.log("STATIC-8 buildScheduleFocusSnapshot Monday = Reconstrução");
  const monday = new Date("2026-08-10T12:00:00Z");
  const mondayPrefs = {
    monday: "Reconstrução",
    tuesday: "Descanso",
    wednesday: "Nutrição",
    thursday: "Descanso",
    friday: "Hidratação",
    saturday: "Cuidado",
    sunday: "Umectação",
    hair_type: null as string | null,
    goal: null as string | null,
  };
  const snapMonday = buildScheduleFocusSnapshot(mondayPrefs, monday);
  if (!snapMonday) throw new Error("monday snap null");
  if (snapMonday.weekday !== "monday" || snapMonday.focus !== "Reconstrução") {
    throw new Error(`snap monday errado: ${JSON.stringify(snapMonday)}`);
  }
  if (snapMonday.hair_type !== undefined && snapMonday.hair_type !== null) {
    throw new Error("hair_type deve estar ausente/null");
  }

  console.log("STATIC-9 buildScheduleFocusSnapshot fallback default por todos os dias úteis básicos");
  const mapDayToExpected = [
    { date: new Date("2026-08-09T12:00:00Z"), w: "sunday", f: "Cuidado" },
    { date: new Date("2026-08-10T12:00:00Z"), w: "monday", f: "Hidratação" },
    { date: new Date("2026-08-12T12:00:00Z"), w: "wednesday", f: "Nutrição" },
    { date: new Date("2026-08-15T12:00:00Z"), w: "saturday", f: "Reconstrução" },
    { date: new Date("2026-08-11T12:00:00Z"), w: "tuesday", f: "Descanso" },
    { date: new Date("2026-08-13T12:00:00Z"), w: "thursday", f: "Descanso" },
    { date: new Date("2026-08-14T12:00:00Z"), w: "friday", f: "Hidratação" },
  ] as const;
  for (const c of mapDayToExpected) {
    const s = buildScheduleFocusSnapshot(null, c.date);
    if (!s) throw new Error(`snap fallback null para ${c.w}`);
    if (s.weekday !== c.w || s.focus !== c.f) {
      throw new Error(`snap fallback ${c.w} esperava ${c.f} recebi ${JSON.stringify(s)}`);
    }
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

  console.log("INT-9 snapshot FALLBACK DEFAULT quando não há schedule_preferences (FREE / sem linha)");
  {
    const s = created.scheduled_focus_snapshot as unknown as {
      focus: string; weekday: string; hair_type?: string | null; goal?: string | null;
    } | null;
    if (!s) {
      throw new Error(`snapshot estava null, devia ter DEFAULT fallback: ${JSON.stringify(created.scheduled_focus_snapshot)}`);
    }
    if (s.focus !== "Cuidado" || s.weekday !== "sunday") {
      throw new Error(`snapshot default domingo devia ser Cuidado: ${JSON.stringify(s)}`);
    }
    // default não tem hair_type/goal:
    if (s.hair_type) throw new Error(`hair_type indevido no default: ${JSON.stringify(s)}`);
    if (s.goal) throw new Error(`goal indevido no default: ${JSON.stringify(s)}`);
  }
  const snapshotCriacaoOriginal = created.scheduled_focus_snapshot;

  console.log("INT-10 insere schedule_preferences (service role). UPDATE não altera snapshot histórico. INSERT NOVA entrada reflete cronograma atual.");
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

  // A) UPDATE note de entry existente: snapshot deve PERMANECER IGUAL ao original
  const refreshed = await upsertDiaryEntry("2026-08-09", { note: "atualizado depois de schedule salvo" });
  if (refreshed.id !== created.id) throw new Error("id mudou no update");
  if (refreshed.scheduled_focus_snapshot !== snapshotCriacaoOriginal) {
    // comparação profunda se for objeto
    const before = JSON.stringify(snapshotCriacaoOriginal);
    const after = JSON.stringify(refreshed.scheduled_focus_snapshot);
    if (before !== after) {
      throw new Error(`UPDATE sobrescreveu snapshot histórico! Antes: ${before}  Depois: ${after}`);
    }
  }
  {
    const r = refreshed.scheduled_focus_snapshot as unknown as { focus: string; weekday: string; hair_type?: string; goal?: string };
    // Snapshot histórico continua Cuidado (fallback quando foi criado, apesar de domingo agora ser Nutrição).
    if (r.focus !== "Cuidado" || r.weekday !== "sunday") {
      throw new Error(`snapshot histórico foi alterado após UPDATE: ${JSON.stringify(r)}`);
    }
  }
  // Campos parciais preservados
  if (refreshed.definition !== 5) throw new Error("definition caiu após update note");
  if (refreshed.treatments.join(",") !== "Lavagem,Hidratação") throw new Error("treatments caiu após update note");
  if (!refreshed.note?.includes("atualizado depois de schedule salvo")) throw new Error("note não atualizou");

  // B) INSERT de nova entrada (domingo 16) → novo snapshot reflete o cronograma ATUAL (domingo = Nutrição, Cacheado, Crescimento)
  console.log("INT-11 INSERT novo domingo (16/08) usa cronograma atualizado");
  const day16 = await upsertDiaryEntry("2026-08-16", {
    treatments: ["Nutrição", "Umectação"], perceived_result: "Muito bom", shine: 5,
  });
  if (day16.entry_date !== "2026-08-16") throw new Error("entry_date errado dia16");
  {
    const snap = day16.scheduled_focus_snapshot as unknown as { focus: string; weekday: string; hair_type?: string; goal?: string };
    if (!snap) throw new Error(`novo snapshot não foi gravado`);
    if (snap.weekday !== "sunday" || snap.focus !== "Nutrição") {
      throw new Error(`snapshot dia 16 devia ser domingo Nutrição: ${JSON.stringify(snap)}`);
    }
    if (snap.hair_type !== "Cacheado" || !snap.goal?.includes("Crescimento")) {
      throw new Error(`snapshot dia 16 não incluiu hair_type/goal: ${JSON.stringify(snap)}`);
    }
  }

  console.log("INT-12 UPDATE treatments (sem mudar dia) não altera snapshot histórico");
  {
    const before = JSON.stringify(day16.scheduled_focus_snapshot);
    const edited = await upsertDiaryEntry("2026-08-16", { treatments: ["Nutrição", "Finalização"], definition: 4 });
    const after = JSON.stringify(edited.scheduled_focus_snapshot);
    if (before !== after) throw new Error(`UPDATE treatments alterou snapshot! Antes:${before}  Depois:${after}`);
    if (edited.treatments.join(",") !== "Nutrição,Finalização") throw new Error("treatments não atualizaram");
    if (edited.definition !== 4) throw new Error("definition não atualizou");
  }

  console.log("INT-13 ALTERAR CRONOGRAMA DEPOIS: domingo = Cuidado → snapshot histórico não muda");
  {
    const up2 = await svc
      .from("schedule_preferences")
      .upsert(
        {
          user_id: userId,
          hair_type: "Ondulado",
          goal: "Reduzir frizz",
          monday: "Hidratação", tuesday: "Descanso", wednesday: "Nutrição",
          thursday: "Descanso", friday: "Hidratação", saturday: "Reconstrução", sunday: "Cuidado",
        },
        { onConflict: "user_id" },
      );
    if (up2.error) throw up2.error;

    // editar note do day16 (que tem domingo Nutrição histórico)
    const beforeSnap = JSON.stringify(day16.scheduled_focus_snapshot);
    const editedDay16 = await upsertDiaryEntry("2026-08-16", { note: "registro do dia 16 atualizado depois mudança cronograma" });
    const afterSnap = JSON.stringify(editedDay16.scheduled_focus_snapshot);
    if (beforeSnap !== afterSnap) {
      throw new Error(`ALTERAR cronograma alterou snapshot histórico dia 16! Antes:${beforeSnap} Depois:${afterSnap}`);
    }
    const snap = editedDay16.scheduled_focus_snapshot as unknown as { focus: string; weekday: string; hair_type?: string; goal?: string };
    // snapshot histórico continua Nutrição/Cacheado/Crescimento
    if (snap.focus !== "Nutrição" || snap.hair_type !== "Cacheado" || !snap.goal?.includes("Crescimento")) {
      throw new Error(`snap histórico não preservado: ${JSON.stringify(snap)}`);
    }
    if (!editedDay16.note?.includes("atualizado depois mudança cronograma")) throw new Error("note não atualizou");
  }

  console.log("INT-14 INSERT NOVA entrada após mudança cronograma reflete novo plano");
  // domingo 23/08
  const day23 = await upsertDiaryEntry("2026-08-23", {
    treatments: ["Lavagem", "Cuidado"], perceived_result: "Bom", breakage: 2,
  });
  {
    const snap = day23.scheduled_focus_snapshot as unknown as { focus: string; weekday: string; hair_type?: string; goal?: string };
    if (!snap) throw new Error("snap dia23 não gravado");
    // Novo cronograma: domingo = Cuidado; hair Ondulado, goal Reduzir frizz
    if (snap.weekday !== "sunday" || snap.focus !== "Cuidado") {
      throw new Error(`snap dia23 esperava domingo=Cuidado: ${JSON.stringify(snap)}`);
    }
    if (snap.hair_type !== "Ondulado" || !snap.goal?.includes("Reduzir frizz")) {
      throw new Error(`snap dia23 não incluiu hair_type/goal NOVOS: ${JSON.stringify(snap)}`);
    }
  }

  console.log("INT-15 snapshot NULL histórico não é preenchido retroativamente em UPDATE");
  {
    const svcEntry = await svc
      .from("diary_entries")
      .insert({
        user_id: userId,
        entry_date: "2026-08-17",
        treatments: ["Finalização"],
        note: "registro sem snapshot (via service)",
      })
      .select("*")
      .single();
    if (svcEntry.error) throw svcEntry.error;
    if (svcEntry.data.scheduled_focus_snapshot !== null) {
      // forçar via service para null para garantir teste
      const forced = await svc
        .from("diary_entries")
        .update({ scheduled_focus_snapshot: null as unknown as never })
        .eq("id", svcEntry.data.id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (forced.error) throw forced.error;
    }

    const edited = await upsertDiaryEntry("2026-08-17", { note: "editado por usuário sem snapshot antigo", shine: 3 });
    if (edited.scheduled_focus_snapshot !== null) {
      throw new Error(`UPDATE Preencheu snapshot NULL retroativamente: ${JSON.stringify(edited.scheduled_focus_snapshot)}`);
    }
    if (!edited.note?.includes("editado por usuário sem snapshot antigo")) throw new Error("note não atualizou H");
    if (edited.shine !== 3) throw new Error("shine não atualizou H");
  }

  console.log("INT-16 service bloqueia treatment fora do domínio (não chega ao banco)");
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
