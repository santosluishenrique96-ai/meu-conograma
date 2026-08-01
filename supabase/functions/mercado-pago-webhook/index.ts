import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
} as const;

type JsonRecord = Record<string, unknown>;

type BillingCheckoutSessionRow = {
  id: string;
  user_id: string;
  subscription_id: string | null;
  plan_id: string;
  gateway: string;
  action: string;
  status: string;
  billing_interval: string;
  amount_snapshot: number | null;
  currency_code: string;
  checkout_url: string | null;
  external_checkout_id: string | null;
  external_customer_id: string | null;
  external_subscription_id: string | null;
  metadata: JsonRecord | null;
  completed_at: string | null;
  canceled_at: string | null;
};

type MercadoPagoNotification = {
  id?: string | number;
  live_mode?: boolean;
  type?: string;
  action?: string;
  data?: {
    id?: string | number;
  };
  date_created?: string;
  user_id?: string | number;
  api_version?: string;
};

type MercadoPagoPayment = {
  id?: string | number;
  status?: string;
  status_detail?: string;
  date_created?: string;
  date_approved?: string | null;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string | null;
  description?: string | null;
  metadata?: JsonRecord | null;
  payer?: {
    id?: string | number;
    email?: string | null;
  } | null;
  order?: {
    id?: string | number;
  } | null;
  point_of_interaction?: {
    transaction_data?: {
      ticket_url?: string | null;
    } | null;
  } | null;
  transaction_details?: {
    external_resource_url?: string | null;
    total_paid_amount?: number | null;
  } | null;
  additional_info?: JsonRecord | null;
  preference_id?: string | null;
};

type MercadoPagoMerchantOrder = {
  id?: string | number;
  status?: string;
  external_reference?: string | null;
  preference_id?: string | null;
  payer?: {
    id?: string | number;
  } | null;
  payments?: Array<{
    id?: string | number;
    status?: string;
  }>;
};

type MercadoPagoSubscription = {
  id?: string | number;
  status?: string;
  external_reference?: string | null;
  payer_id?: string | number | null;
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

function createSupabaseServiceRoleClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function toJsonRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

function normalizeString(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeNotificationType(
  bodyType: string | undefined,
  queryType: string | null,
  action: string | undefined,
) {
  const actionType =
    normalizeString(action)?.includes(".") ? normalizeString(action)?.split(".", 1)[0] ?? null : null;
  const type =
    normalizeString(bodyType) ?? normalizeString(queryType) ?? actionType ?? normalizeString(action) ?? "unknown";
  return type.toLowerCase();
}

function parseNotificationBody(rawBody: string) {
  try {
    return JSON.parse(rawBody) as MercadoPagoNotification;
  } catch {
    throw new HttpError(400, "INVALID_JSON", "O corpo da requisicao deve ser um JSON valido.");
  }
}

function parseSignatureHeader(signatureHeader: string | null) {
  if (!signatureHeader) {
    throw new HttpError(401, "INVALID_SIGNATURE", "Header x-signature ausente.");
  }

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((accumulator, part) => {
    const [rawKey, rawValue] = part.split("=", 2);
    const key = rawKey?.trim().toLowerCase();
    const value = rawValue?.trim();

    if (key && value) {
      accumulator[key] = value;
    }

    return accumulator;
  }, {});

  if (!parts.ts || !parts.v1) {
    throw new HttpError(401, "INVALID_SIGNATURE", "Header x-signature invalido.");
  }

  return {
    timestamp: parts.ts,
    signature: parts.v1.toLowerCase(),
  };
}

function buildSignatureManifest({
  resourceId,
  requestId,
  timestamp,
}: {
  resourceId: string | null;
  requestId: string | null;
  timestamp: string;
}) {
  const parts: string[] = [];

  if (resourceId) {
    parts.push(`id:${resourceId}`);
  }

  if (requestId) {
    parts.push(`request-id:${requestId}`);
  }

  parts.push(`ts:${timestamp}`);

  return `${parts.join(";")};`;
}

function hexToBytes(hex: string) {
  const normalized = hex.trim().toLowerCase();

  if (normalized.length % 2 !== 0) {
    throw new HttpError(401, "INVALID_SIGNATURE", "Assinatura hexadecimal invalida.");
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }

  return diff === 0;
}

async function computeHmacHex(secret: string, manifest: string) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(manifest));
  return bytesToHex(new Uint8Array(signatureBuffer));
}

async function validateWebhookSignature({
  secret,
  request,
  resourceId,
}: {
  secret: string;
  request: Request;
  resourceId: string | null;
}) {
  const signatureHeader = request.headers.get("x-signature");
  const requestId = normalizeString(request.headers.get("x-request-id"));
  const { timestamp, signature } = parseSignatureHeader(signatureHeader);
  const manifest = buildSignatureManifest({
    resourceId,
    requestId,
    timestamp,
  });
  const computed = await computeHmacHex(secret, manifest);

  const computedBytes = hexToBytes(computed);
  const receivedBytes = hexToBytes(signature);

  if (!constantTimeEqual(computedBytes, receivedBytes)) {
    throw new HttpError(401, "INVALID_SIGNATURE", "A assinatura do webhook do Mercado Pago e invalida.");
  }

  return {
    signature,
    requestId,
    timestamp,
    manifest,
  };
}

async function fetchMercadoPagoResource<T>({
  accessToken,
  path,
}: {
  accessToken: string;
  path: string;
}) {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const payload = await response.json().catch(() => null);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new HttpError(502, "MERCADO_PAGO_API_ERROR", "Falha ao consultar o recurso no Mercado Pago.", {
      path,
      status: response.status,
      payload,
    });
  }

  return payload as T;
}

async function resolveMercadoPagoResources({
  accessToken,
  notificationType,
  resourceId,
}: {
  accessToken: string;
  notificationType: string;
  resourceId: string | null;
}) {
  let payment: MercadoPagoPayment | null = null;
  let merchantOrder: MercadoPagoMerchantOrder | null = null;
  let subscription: MercadoPagoSubscription | null = null;

  if (!resourceId) {
    return { payment, merchantOrder, subscription };
  }

  if (notificationType === "payment") {
    payment = await fetchMercadoPagoResource<MercadoPagoPayment>({
      accessToken,
      path: `/v1/payments/${resourceId}`,
    });

    const merchantOrderId = normalizeString(payment?.order?.id);
    if (merchantOrderId) {
      merchantOrder = await fetchMercadoPagoResource<MercadoPagoMerchantOrder>({
        accessToken,
        path: `/merchant_orders/${merchantOrderId}`,
      });
    }

    return { payment, merchantOrder, subscription };
  }

  if (notificationType === "merchant_order") {
    merchantOrder = await fetchMercadoPagoResource<MercadoPagoMerchantOrder>({
      accessToken,
      path: `/merchant_orders/${resourceId}`,
    });

    const prioritizedPaymentId =
      normalizeString(
        merchantOrder?.payments?.find((item) => item.status === "approved")?.id ??
          merchantOrder?.payments?.at(-1)?.id,
      ) ?? null;

    if (prioritizedPaymentId) {
      payment = await fetchMercadoPagoResource<MercadoPagoPayment>({
        accessToken,
        path: `/v1/payments/${prioritizedPaymentId}`,
      });
    }

    return { payment, merchantOrder, subscription };
  }

  if (
    notificationType === "subscription_preapproval" ||
    notificationType === "subscription" ||
    notificationType === "preapproval"
  ) {
    subscription = await fetchMercadoPagoResource<MercadoPagoSubscription>({
      accessToken,
      path: `/preapproval/${resourceId}`,
    });

    return { payment, merchantOrder, subscription };
  }

  if (notificationType === "subscription_authorized_payment") {
    payment = await fetchMercadoPagoResource<MercadoPagoPayment>({
      accessToken,
      path: `/authorized_payments/${resourceId}`,
    });

    return { payment, merchantOrder, subscription };
  }

  return { payment, merchantOrder, subscription };
}

async function findCheckoutSession({
  supabase,
  preferenceId,
  externalReference,
}: {
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>;
  preferenceId: string | null;
  externalReference: string | null;
}) {
  if (preferenceId) {
    const { data, error } = await supabase
      .from("billing_checkout_sessions")
      .select(
        "id, user_id, subscription_id, plan_id, gateway, action, status, billing_interval, amount_snapshot, currency_code, checkout_url, external_checkout_id, external_customer_id, external_subscription_id, metadata, completed_at, canceled_at",
      )
      .eq("gateway", "mercado-pago")
      .eq("external_checkout_id", preferenceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new HttpError(500, "DATABASE_ERROR", "Falha ao localizar a sessao de checkout pelo preference_id.", {
        cause: error.message,
      });
    }

    if (data) {
      return data as BillingCheckoutSessionRow;
    }
  }

  if (externalReference) {
    const { data, error } = await supabase
      .from("billing_checkout_sessions")
      .select(
        "id, user_id, subscription_id, plan_id, gateway, action, status, billing_interval, amount_snapshot, currency_code, checkout_url, external_checkout_id, external_customer_id, external_subscription_id, metadata, completed_at, canceled_at",
      )
      .eq("gateway", "mercado-pago")
      .contains("metadata", { externalReference })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new HttpError(
        500,
        "DATABASE_ERROR",
        "Falha ao localizar a sessao de checkout pela external_reference.",
        {
          cause: error.message,
        },
      );
    }

    if (data) {
      return data as BillingCheckoutSessionRow;
    }
  }

  return null;
}

function resolveResourceId(request: Request, notification: MercadoPagoNotification) {
  const url = new URL(request.url);
  return (
    normalizeString(notification.data?.id) ??
    normalizeString(url.searchParams.get("data.id")) ??
    normalizeString(url.searchParams.get("id"))
  );
}

function buildExternalEventId(notification: MercadoPagoNotification, resourceId: string | null, type: string) {
  return (
    normalizeString(notification.id) ??
    [type, normalizeString(notification.action) ?? "event", resourceId ?? crypto.randomUUID()].join(":")
  );
}

function addBillingInterval(startAt: string, billingInterval: string) {
  const date = new Date(startAt);

  if (billingInterval === "annual") {
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString();
  }

  date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}

function resolveCheckoutStatus(paymentStatus: string | null, fallbackType: string) {
  const normalized = paymentStatus?.toLowerCase() ?? fallbackType.toLowerCase();

  if (normalized === "approved") return "completed";
  if (normalized === "cancelled" || normalized === "canceled") return "canceled";
  if (normalized === "rejected") return "failed";
  if (normalized === "refunded" || normalized === "charged_back") return "completed";
  return "pending";
}

function resolveInvoiceStatus(paymentStatus: string | null) {
  const normalized = paymentStatus?.toLowerCase() ?? "open";

  if (normalized === "approved") return "paid";
  if (normalized === "cancelled" || normalized === "canceled") return "void";
  if (normalized === "rejected") return "failed";
  if (normalized === "refunded") return "refunded";
  if (normalized === "charged_back") return "uncollectible";
  return "open";
}

function resolvePrimaryPaymentStatus({
  payment,
  merchantOrder,
  subscription,
}: {
  payment: MercadoPagoPayment | null;
  merchantOrder: MercadoPagoMerchantOrder | null;
  subscription: MercadoPagoSubscription | null;
}) {
  return (
    normalizeString(payment?.status) ??
    normalizeString(merchantOrder?.status) ??
    normalizeString(subscription?.status)
  );
}

function resolvePreferenceId({
  payment,
  merchantOrder,
}: {
  payment: MercadoPagoPayment | null;
  merchantOrder: MercadoPagoMerchantOrder | null;
}) {
  return normalizeString(payment?.preference_id) ?? normalizeString(merchantOrder?.preference_id);
}

function resolveExternalReference({
  payment,
  merchantOrder,
  subscription,
}: {
  payment: MercadoPagoPayment | null;
  merchantOrder: MercadoPagoMerchantOrder | null;
  subscription: MercadoPagoSubscription | null;
}) {
  return (
    normalizeString(payment?.external_reference) ??
    normalizeString(merchantOrder?.external_reference) ??
    normalizeString(subscription?.external_reference)
  );
}

function resolveExternalCustomerId({
  payment,
  merchantOrder,
  subscription,
}: {
  payment: MercadoPagoPayment | null;
  merchantOrder: MercadoPagoMerchantOrder | null;
  subscription: MercadoPagoSubscription | null;
}) {
  return (
    normalizeString(payment?.payer?.id) ??
    normalizeString(merchantOrder?.payer?.id) ??
    normalizeString(subscription?.payer_id)
  );
}

function buildSessionMetadata({
  currentMetadata,
  notification,
  signatureValidation,
  resourceId,
  externalReference,
  payment,
  merchantOrder,
  subscription,
}: {
  currentMetadata: JsonRecord | null;
  notification: MercadoPagoNotification;
  signatureValidation: {
    requestId: string | null;
    timestamp: string;
  };
  resourceId: string | null;
  externalReference: string | null;
  payment: MercadoPagoPayment | null;
  merchantOrder: MercadoPagoMerchantOrder | null;
  subscription: MercadoPagoSubscription | null;
}) {
  return {
    ...toJsonRecord(currentMetadata),
    externalReference,
    mercadoPago: {
      ...(toJsonRecord(toJsonRecord(currentMetadata).mercadoPago)),
      webhook: {
        receivedAt: new Date().toISOString(),
        type: notification.type ?? null,
        action: notification.action ?? null,
        resourceId,
        requestId: signatureValidation.requestId,
        timestamp: signatureValidation.timestamp,
      },
      payment: payment ? toJsonRecord(payment) : null,
      merchantOrder: merchantOrder ? toJsonRecord(merchantOrder) : null,
      subscription: subscription ? toJsonRecord(subscription) : null,
    },
  };
}

async function markWebhookEvent({
  supabase,
  eventId,
  eventStatus,
  lastError,
}: {
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>;
  eventId: string;
  eventStatus: "pending" | "processed" | "ignored" | "failed";
  lastError?: string | null;
}) {
  const { error } = await supabase
    .from("billing_webhook_events")
    .update({
      event_status: eventStatus,
      last_error: lastError ?? null,
      processed_at: eventStatus === "processed" || eventStatus === "ignored" ? new Date().toISOString() : null,
    })
    .eq("id", eventId);

  if (error) {
    throw new HttpError(500, "DATABASE_ERROR", "Falha ao atualizar o status do webhook.", {
      cause: error.message,
    });
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonError(new HttpError(405, "METHOD_NOT_ALLOWED", "Somente o metodo POST e suportado."));
  }

  let webhookEventId: string | null = null;

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const mercadoPagoAccessToken = requireEnv("MERCADO_PAGO_ACCESS_TOKEN");
    const mercadoPagoWebhookSecret = requireEnv("MERCADO_PAGO_WEBHOOK_SECRET");

    const supabase = createSupabaseServiceRoleClient(supabaseUrl, supabaseServiceRoleKey);

    const rawBody = await request.text();
    const notification = parseNotificationBody(rawBody);
    const resourceId = resolveResourceId(request, notification);
    const notificationType = normalizeNotificationType(
      notification.type,
      new URL(request.url).searchParams.get("type"),
      notification.action,
    );
    const signatureValidation = await validateWebhookSignature({
      secret: mercadoPagoWebhookSecret,
      request,
      resourceId,
    });

    const externalEventId = buildExternalEventId(notification, resourceId, notificationType);
    const rawPayload = {
      body: notification,
      query: Object.fromEntries(new URL(request.url).searchParams.entries()),
      headers: {
        xSignature: request.headers.get("x-signature"),
        xRequestId: request.headers.get("x-request-id"),
      },
      signatureValidation: {
        requestId: signatureValidation.requestId,
        timestamp: signatureValidation.timestamp,
      },
    };

    const { data: eventId, error: registerEventError } = await supabase.rpc(
      "register_billing_webhook_event",
      {
        target_gateway: "mercado-pago",
        target_event_type: notificationType,
        target_external_event_id: externalEventId,
        target_payload: rawPayload,
        target_signature: signatureValidation.signature,
      },
    );

    if (registerEventError || !eventId) {
      throw new HttpError(500, "DATABASE_ERROR", "Falha ao registrar o evento bruto do webhook.", {
        cause: registerEventError?.message ?? null,
      });
    }

    webhookEventId = eventId as string;

    const { payment, merchantOrder, subscription } = await resolveMercadoPagoResources({
      accessToken: mercadoPagoAccessToken,
      notificationType,
      resourceId,
    });

    const preferenceId = resolvePreferenceId({ payment, merchantOrder });
    const externalReference = resolveExternalReference({ payment, merchantOrder, subscription });
    const checkoutSession = await findCheckoutSession({
      supabase,
      preferenceId,
      externalReference,
    });

    if (!checkoutSession) {
      await markWebhookEvent({
        supabase,
        eventId: webhookEventId,
        eventStatus: "ignored",
        lastError: "Sessao de checkout nao encontrada para o evento recebido.",
      });

      return jsonResponse(200, {
        received: true,
        processed: false,
        ignored: true,
        reason: "checkout_session_not_found",
      });
    }

    const paymentStatus = resolvePrimaryPaymentStatus({
      payment,
      merchantOrder,
      subscription,
    });
    const checkoutStatus = resolveCheckoutStatus(paymentStatus, notificationType);
    const invoiceStatus = resolveInvoiceStatus(paymentStatus);
    const externalCustomerId = resolveExternalCustomerId({
      payment,
      merchantOrder,
      subscription,
    });
    const externalSubscriptionId = normalizeString(subscription?.id);
    const mergedMetadata = buildSessionMetadata({
      currentMetadata: checkoutSession.metadata,
      notification,
      signatureValidation,
      resourceId,
      externalReference,
      payment,
      merchantOrder,
      subscription,
    });

    let resolvedSubscriptionId = checkoutSession.subscription_id;

    if (payment) {
      const paidAt = normalizeString(payment.date_approved);
      const periodStart = paidAt ?? normalizeString(payment.date_created) ?? new Date().toISOString();
      const invoiceMetadata = {
        checkoutSessionId: checkoutSession.id,
        externalReference,
        paymentStatus,
        paymentStatusDetail: payment.status_detail ?? null,
        preferenceId,
        requestType: notificationType,
        payment,
      };

      const { error: upsertInvoiceError } = await supabase.rpc("upsert_billing_invoice", {
        target_user_id: checkoutSession.user_id,
        target_subscription_id: resolvedSubscriptionId,
        target_plan_id: checkoutSession.plan_id,
        target_gateway: "mercado-pago",
        target_status: invoiceStatus,
        target_billing_reason: "subscription_create",
        target_external_invoice_id: normalizeString(payment.id),
        target_amount_due: Number(payment.transaction_amount ?? checkoutSession.amount_snapshot ?? 0),
        target_amount_paid: Number(
          payment.status === "approved"
            ? payment.transaction_details?.total_paid_amount ?? payment.transaction_amount ?? 0
            : 0,
        ),
        target_amount_refunded:
          payment.status === "refunded"
            ? Number(payment.transaction_details?.total_paid_amount ?? payment.transaction_amount ?? 0)
            : 0,
        target_currency_code: normalizeString(payment.currency_id) ?? checkoutSession.currency_code ?? "BRL",
        target_period_start: periodStart,
        target_period_end: payment.status === "approved" ? addBillingInterval(periodStart, checkoutSession.billing_interval) : null,
        target_due_at: null,
        target_paid_at: paidAt,
        target_invoice_url: normalizeString(payment.transaction_details?.external_resource_url),
        target_hosted_invoice_url: normalizeString(payment.point_of_interaction?.transaction_data?.ticket_url),
        target_metadata: invoiceMetadata,
      });

      if (upsertInvoiceError) {
        throw new HttpError(500, "DATABASE_ERROR", "Falha ao atualizar a fatura do billing.", {
          cause: upsertInvoiceError.message,
        });
      }
    }

    if (payment?.status === "approved") {
      const approvedAt = normalizeString(payment.date_approved) ?? new Date().toISOString();
      const currentPeriodEndsAt = addBillingInterval(approvedAt, checkoutSession.billing_interval);

      const { data: appliedSubscriptionId, error: applySubscriptionError } = await supabase.rpc(
        "apply_billing_subscription_event",
        {
          target_user_id: checkoutSession.user_id,
          target_plan_id: checkoutSession.plan_id,
          target_gateway: "mercado-pago",
          lifecycle_event: "payment_approved",
          next_status: "active",
          target_billing_interval: checkoutSession.billing_interval,
          target_subscription_id: resolvedSubscriptionId,
          target_external_customer_id: externalCustomerId,
          target_external_subscription_id: externalSubscriptionId,
          target_external_reference: externalReference,
          target_price_snapshot: checkoutSession.amount_snapshot,
          target_currency_code: normalizeString(payment.currency_id) ?? checkoutSession.currency_code ?? "BRL",
          target_current_period_starts_at: approvedAt,
          target_current_period_ends_at: currentPeriodEndsAt,
          target_due_at: currentPeriodEndsAt,
          target_trial_starts_at: null,
          target_trial_ends_at: null,
          target_auto_renew: true,
          target_metadata: {
            checkoutSessionId: checkoutSession.id,
            preferenceId,
            paymentId: normalizeString(payment.id),
            externalReference,
            source: "mercado-pago-webhook",
          },
        },
      );

      if (applySubscriptionError || !appliedSubscriptionId) {
        throw new HttpError(500, "DATABASE_ERROR", "Falha ao aplicar o evento de assinatura existente.", {
          cause: applySubscriptionError?.message ?? null,
        });
      }

      resolvedSubscriptionId = appliedSubscriptionId as string;
    }

    const { error: updateSessionError } = await supabase
      .from("billing_checkout_sessions")
      .update({
        status: checkoutStatus,
        subscription_id: resolvedSubscriptionId,
        external_checkout_id: preferenceId ?? checkoutSession.external_checkout_id,
        external_customer_id: externalCustomerId ?? checkoutSession.external_customer_id,
        external_subscription_id: externalSubscriptionId ?? checkoutSession.external_subscription_id,
        completed_at:
          payment?.status === "approved"
            ? normalizeString(payment.date_approved) ?? new Date().toISOString()
            : checkoutSession.completed_at,
        canceled_at:
          checkoutStatus === "canceled" ? new Date().toISOString() : checkoutStatus === "failed" ? null : checkoutSession.canceled_at,
        metadata: mergedMetadata,
      })
      .eq("id", checkoutSession.id);

    if (updateSessionError) {
      throw new HttpError(500, "DATABASE_ERROR", "Falha ao atualizar a sessao de checkout.", {
        cause: updateSessionError.message,
      });
    }

    await markWebhookEvent({
      supabase,
      eventId: webhookEventId,
      eventStatus: "processed",
    });

    return jsonResponse(200, {
      received: true,
      processed: true,
      checkoutSessionId: checkoutSession.id,
      webhookEventId,
      paymentStatus,
    });
  } catch (error) {
    if (webhookEventId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (supabaseUrl && supabaseServiceRoleKey) {
          const supabase = createSupabaseServiceRoleClient(supabaseUrl, supabaseServiceRoleKey);
          await markWebhookEvent({
            supabase,
            eventId: webhookEventId,
            eventStatus: "failed",
            lastError: error instanceof Error ? error.message : "Erro inesperado no webhook.",
          });
        }
      } catch (persistError) {
        console.error("[mercado-pago-webhook] failed to persist webhook failure", persistError);
      }
    }

    if (error instanceof HttpError) {
      console.error("[mercado-pago-webhook]", error.code, error.message, error.details);
      return jsonError(error);
    }

    console.error("[mercado-pago-webhook] unexpected error", error);
    return jsonError(
      new HttpError(500, "INTERNAL_ERROR", "Erro inesperado ao processar o webhook do Mercado Pago."),
    );
  }
});
