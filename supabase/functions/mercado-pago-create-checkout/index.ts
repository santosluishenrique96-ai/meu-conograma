import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
} as const;

type BillingInterval = "monthly" | "annual";

type CreateCheckoutRequest = {
  userId?: string;
  planId?: string;
  billingInterval?: string;
  successUrl?: string;
  cancelUrl?: string;
};

type SubscriptionPlanRow = {
  id: string;
  slug: string;
  name: string;
  monthly_price: number;
  annual_price: number;
  promotional_price: number | null;
  is_active: boolean;
};

class HttpError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });
}

function jsonError(error: HttpError) {
  return jsonResponse(error.status, {
    error: {
      code: error.code,
      message: error.message,
      details: error.details ?? null,
    },
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new HttpError(500, "CONFIGURATION_ERROR", `Secret obrigatorio ausente: ${name}`);
  }

  return value;
}

function assertHttpUrl(value: string | undefined, field: "successUrl" | "cancelUrl") {
  if (!value?.trim()) {
    throw new HttpError(400, "VALIDATION_ERROR", `Campo obrigatorio ausente: ${field}`);
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new HttpError(400, "VALIDATION_ERROR", `URL invalida para o campo: ${field}`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new HttpError(400, "VALIDATION_ERROR", `Protocolo de URL nao suportado para o campo: ${field}`);
  }

  return parsed.toString();
}

function assertBillingInterval(value: string | undefined): BillingInterval {
  if (value === "monthly" || value === "annual") {
    return value;
  }

  throw new HttpError(400, "VALIDATION_ERROR", "billingInterval invalido. Use monthly ou annual.");
}

function resolvePlanPrice(plan: SubscriptionPlanRow, billingInterval: BillingInterval) {
  if (billingInterval === "annual") {
    return Number(plan.annual_price);
  }

  if (plan.promotional_price !== null && Number(plan.promotional_price) >= 0) {
    return Number(plan.promotional_price);
  }

  return Number(plan.monthly_price);
}

function buildExternalReference(checkoutSessionId: string) {
  return `billing_checkout_session:${checkoutSessionId}`;
}

function createSupabaseUserClient(supabaseUrl: string, supabaseAnonKey: string, authHeader: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function createSupabaseServiceRoleClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function createMercadoPagoPreference({
  accessToken,
  plan,
  userEmail,
  billingInterval,
  amount,
  successUrl,
  cancelUrl,
  externalReference,
  checkoutSessionId,
  userId,
}: {
  accessToken: string;
  plan: SubscriptionPlanRow;
  userEmail: string | null;
  billingInterval: BillingInterval;
  amount: number;
  successUrl: string;
  cancelUrl: string;
  externalReference: string;
  checkoutSessionId: string;
  userId: string;
}) {
  const descriptionSuffix = billingInterval === "annual" ? "anual" : "mensal";
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": checkoutSessionId,
    },
    body: JSON.stringify({
      items: [
        {
          id: plan.id,
          title: plan.name,
          description: `Assinatura ${descriptionSuffix} do plano ${plan.name}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: amount,
        },
      ],
      payer: userEmail ? { email: userEmail } : undefined,
      external_reference: externalReference,
      auto_return: "approved",
      back_urls: {
        success: successUrl,
        failure: cancelUrl,
        pending: successUrl,
      },
      metadata: {
        user_id: userId,
        plan_id: plan.id,
        plan_slug: plan.slug,
        billing_interval: billingInterval,
        checkout_session_id: checkoutSessionId,
      },
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new HttpError(502, "MERCADO_PAGO_API_ERROR", "Falha ao criar a preference no Mercado Pago.", {
      status: response.status,
      payload,
    });
  }

  const preferenceId = typeof payload?.id === "string" ? payload.id : null;
  const initPoint = typeof payload?.init_point === "string" ? payload.init_point : null;

  if (!preferenceId || !initPoint) {
    throw new HttpError(
      502,
      "MERCADO_PAGO_INVALID_RESPONSE",
      "O Mercado Pago nao retornou os identificadores obrigatorios do checkout.",
      { payload },
    );
  }

  return {
    preferenceId,
    initPoint,
    rawPayload: payload,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonError(new HttpError(405, "METHOD_NOT_ALLOWED", "Somente o metodo POST e suportado."));
  }

  let checkoutSessionId: string | null = null;

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const mercadoPagoAccessToken = requireEnv("MERCADO_PAGO_ACCESS_TOKEN");

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new HttpError(401, "AUTH_REQUIRED", "Authorization header ausente ou invalido.");
    }

    const body = (await request.json().catch(() => null)) as CreateCheckoutRequest | null;
    if (!body) {
      throw new HttpError(400, "INVALID_JSON", "O corpo da requisicao deve ser um JSON valido.");
    }

    if (!body.userId?.trim()) {
      throw new HttpError(400, "VALIDATION_ERROR", "Campo obrigatorio ausente: userId");
    }

    if (!body.planId?.trim()) {
      throw new HttpError(400, "VALIDATION_ERROR", "Campo obrigatorio ausente: planId");
    }

    const billingInterval = assertBillingInterval(body.billingInterval);
    const successUrl = assertHttpUrl(body.successUrl, "successUrl");
    const cancelUrl = assertHttpUrl(body.cancelUrl, "cancelUrl");

    const supabaseUserClient = createSupabaseUserClient(supabaseUrl, supabaseAnonKey, authHeader);
    const supabaseServiceRoleClient = createSupabaseServiceRoleClient(
      supabaseUrl,
      supabaseServiceRoleKey,
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUserClient.auth.getUser();

    if (authError || !user) {
      throw new HttpError(401, "AUTH_REQUIRED", "Nao foi possivel validar o usuario autenticado.");
    }

    if (user.id !== body.userId) {
      throw new HttpError(403, "USER_MISMATCH", "O usuario autenticado nao corresponde ao userId informado.");
    }

    const { data: planData, error: planError } = await supabaseServiceRoleClient
      .from("subscription_plans")
      .select("id, slug, name, monthly_price, annual_price, promotional_price, is_active")
      .eq("id", body.planId)
      .maybeSingle();

    if (planError) {
      throw new HttpError(500, "DATABASE_ERROR", "Falha ao carregar o plano de assinatura.", {
        cause: planError.message,
      });
    }

    const plan = (planData as SubscriptionPlanRow | null) ?? null;

    if (!plan || !plan.is_active) {
      throw new HttpError(404, "PLAN_NOT_FOUND", "Plano de assinatura ativo nao encontrado.");
    }

    const amount = resolvePlanPrice(plan, billingInterval);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpError(
        400,
        "PLAN_NOT_ELIGIBLE_FOR_CHECKOUT",
        "Este plano nao possui valor pago compativel com o Checkout Pro.",
      );
    }

    const baseMetadata = {
      source: "mercado-pago-create-checkout",
      userId: user.id,
      planSlug: plan.slug,
      planName: plan.name,
      billingInterval,
      checkoutProvider: "checkout-pro",
    };

    const { data: createdSessionId, error: createSessionError } = await supabaseUserClient.rpc(
      "record_billing_checkout_session",
      {
        target_plan_id: plan.id,
        target_gateway: "mercado-pago",
        target_action: "subscribe",
        target_billing_interval: billingInterval,
        target_subscription_id: null,
        target_amount_snapshot: amount,
        target_currency_code: "BRL",
        target_checkout_url: null,
        target_success_url: successUrl,
        target_cancel_url: cancelUrl,
        target_metadata: baseMetadata,
        target_expires_at: null,
      },
    );

    if (createSessionError || !createdSessionId) {
      throw new HttpError(500, "DATABASE_ERROR", "Falha ao criar a sessao de checkout no billing.", {
        cause: createSessionError?.message ?? null,
      });
    }

    checkoutSessionId = createdSessionId as string;
    const externalReference = buildExternalReference(checkoutSessionId);

    const mercadoPagoPreference = await createMercadoPagoPreference({
      accessToken: mercadoPagoAccessToken,
      plan,
      userEmail: user.email ?? null,
      billingInterval,
      amount,
      successUrl,
      cancelUrl,
      externalReference,
      checkoutSessionId,
      userId: user.id,
    });

    const checkoutMetadata = {
      ...baseMetadata,
      externalReference,
      mercadoPago: {
        preferenceId: mercadoPagoPreference.preferenceId,
      },
    };

    const { error: updateSessionError } = await supabaseServiceRoleClient
      .from("billing_checkout_sessions")
      .update({
        gateway: "mercado-pago",
        status: "pending",
        checkout_url: mercadoPagoPreference.initPoint,
        external_checkout_id: mercadoPagoPreference.preferenceId,
        metadata: checkoutMetadata,
      })
      .eq("id", checkoutSessionId)
      .eq("user_id", user.id);

    if (updateSessionError) {
      throw new HttpError(500, "DATABASE_ERROR", "Falha ao persistir os dados do checkout do Mercado Pago.", {
        cause: updateSessionError.message,
      });
    }

    return jsonResponse(200, {
      checkoutUrl: mercadoPagoPreference.initPoint,
      preferenceId: mercadoPagoPreference.preferenceId,
      checkoutSessionId,
    });
  } catch (error) {
    if (checkoutSessionId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (supabaseUrl && supabaseServiceRoleKey) {
          const serviceRoleClient = createSupabaseServiceRoleClient(
            supabaseUrl,
            supabaseServiceRoleKey,
          );

          await serviceRoleClient
            .from("billing_checkout_sessions")
            .update({
              status: "failed",
              metadata: {
                source: "mercado-pago-create-checkout",
                checkoutSessionId,
                failureCode: error instanceof HttpError ? error.code : "UNEXPECTED_ERROR",
                failureMessage: error instanceof Error ? error.message : "Erro inesperado",
              },
            })
            .eq("id", checkoutSessionId);
        }
      } catch (persistError) {
        console.error("[mercado-pago-create-checkout] failed to persist session failure", persistError);
      }
    }

    if (error instanceof HttpError) {
      console.error("[mercado-pago-create-checkout]", error.code, error.message, error.details);
      return jsonError(error);
    }

    console.error("[mercado-pago-create-checkout] unexpected error", error);
    return jsonError(
      new HttpError(500, "INTERNAL_ERROR", "Erro inesperado ao criar o checkout do Mercado Pago."),
    );
  }
});
