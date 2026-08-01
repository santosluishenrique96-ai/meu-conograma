import {
  PRIMARY_BILLING_GATEWAY_KEY,
} from "@/types/billing";
import type {
  BillingGatewayAdapter,
  BillingGatewayDefinition,
  BillingGatewayKey,
  PrepareBillingPortalActionInput,
  PreparedBillingPortalAction,
  PrepareCheckoutSessionInput,
  PreparedCheckoutSession,
} from "@/types/billing";

const gatewayDefinitions: BillingGatewayDefinition[] = [
  {
    key: "mercado-pago",
    name: "Mercado Pago",
    marketingSite: "https://www.mercadopago.com.br/",
    description: "Gateway forte para operacao local com Pix, boleto e cartao.",
    supportedCountries: ["BR", "AR", "MX", "CL", "CO", "UY"],
    capabilities: [
      "checkout",
      "subscription-upgrade",
      "subscription-downgrade",
      "subscription-cancel",
      "webhook-sync",
    ],
    defaultCurrency: "BRL",
    statusLabel: "Pronto para integrar",
  },
  {
    key: "stripe",
    name: "Stripe",
    marketingSite: "https://stripe.com/br",
    description: "Checkout global com foco em assinaturas recorrentes e portal do cliente.",
    supportedCountries: ["BR", "US", "EU"],
    capabilities: [
      "checkout",
      "customer-portal",
      "subscription-upgrade",
      "subscription-downgrade",
      "subscription-cancel",
      "subscription-reactivate",
      "webhook-sync",
    ],
    defaultCurrency: "BRL",
    statusLabel: "Pronto para integrar",
  },
  {
    key: "asaas",
    name: "Asaas",
    marketingSite: "https://www.asaas.com/",
    description: "Cobranca recorrente nacional com Pix, boleto e cartao.",
    supportedCountries: ["BR"],
    capabilities: [
      "checkout",
      "subscription-upgrade",
      "subscription-downgrade",
      "subscription-cancel",
      "subscription-reactivate",
      "webhook-sync",
    ],
    defaultCurrency: "BRL",
    statusLabel: "Pronto para integrar",
  },
  {
    key: "pagseguro",
    name: "PagSeguro",
    marketingSite: "https://pagseguro.uol.com.br/",
    description: "Checkout nacional com alternativas amplas de pagamento.",
    supportedCountries: ["BR"],
    capabilities: [
      "checkout",
      "subscription-upgrade",
      "subscription-cancel",
      "webhook-sync",
    ],
    defaultCurrency: "BRL",
    statusLabel: "Pronto para integrar",
  },
  {
    key: "kirvano",
    name: "Kirvano",
    marketingSite: "https://kirvano.com/",
    description: "Plataforma para produtos digitais e afiliacao com checkout.",
    supportedCountries: ["BR"],
    capabilities: ["checkout", "subscription-cancel", "webhook-sync"],
    defaultCurrency: "BRL",
    statusLabel: "Pronto para integrar",
  },
  {
    key: "kiwify",
    name: "Kiwify",
    marketingSite: "https://kiwify.com.br/",
    description: "Checkout focado em infoprodutos e funis digitais.",
    supportedCountries: ["BR"],
    capabilities: ["checkout", "subscription-cancel", "webhook-sync"],
    defaultCurrency: "BRL",
    statusLabel: "Pronto para integrar",
  },
  {
    key: "hotmart",
    name: "Hotmart",
    marketingSite: "https://www.hotmart.com/",
    description: "Ecossistema de produtos digitais com recorrencia e afiliacao.",
    supportedCountries: ["BR", "US", "EU", "LATAM"],
    capabilities: ["checkout", "subscription-cancel", "webhook-sync"],
    defaultCurrency: "BRL",
    statusLabel: "Pronto para integrar",
  },
  {
    key: "eduzz",
    name: "Eduzz",
    marketingSite: "https://www.eduzz.com/",
    description: "Plataforma de vendas digitais com checkout e pos-venda.",
    supportedCountries: ["BR"],
    capabilities: ["checkout", "subscription-cancel", "webhook-sync"],
    defaultCurrency: "BRL",
    statusLabel: "Pronto para integrar",
  },
  {
    key: "monetizze",
    name: "Monetizze",
    marketingSite: "https://monetizze.com.br/",
    description: "Checkout para recorrencia e operacao de produtos digitais.",
    supportedCountries: ["BR"],
    capabilities: ["checkout", "subscription-cancel", "webhook-sync"],
    defaultCurrency: "BRL",
    statusLabel: "Pronto para integrar",
  },
];

function getPlanAmount(input: PrepareCheckoutSessionInput) {
  if (input.billingInterval === "annual") {
    return input.plan.annual_price;
  }

  return input.plan.promotional_price ?? input.plan.monthly_price;
}

function buildPlaceholderUrl(basePath: string, params: Record<string, string>) {
  const url = new URL(`https://checkout-placeholder.meu-cronograma.local/${basePath}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

class PlaceholderBillingGatewayAdapter implements BillingGatewayAdapter {
  constructor(public definition: BillingGatewayDefinition) {}

  async prepareCheckoutSession(
    input: PrepareCheckoutSessionInput,
  ): Promise<PreparedCheckoutSession> {
    return {
      gateway: this.definition,
      action: input.action,
      planId: input.plan.id,
      checkoutMode: "redirect",
      checkoutUrl: buildPlaceholderUrl("checkout", {
        gateway: this.definition.key,
        action: input.action,
        plan: input.plan.slug,
        interval: input.billingInterval,
      }),
      priceAmount: getPlanAmount(input),
      currencyCode: this.definition.defaultCurrency,
      metadata: {
        planName: input.plan.name,
        billingInterval: input.billingInterval,
        userId: input.customer.userId,
        currentSubscriptionId: input.currentSubscription?.id ?? null,
        ...input.metadata,
      },
      message: `${this.definition.name} foi selecionado como gateway. O fluxo real de checkout ainda nao foi conectado, mas a arquitetura ja esta pronta para receber a implementacao.`,
      isLive: false,
    };
  }

  async prepareBillingPortalAction(
    input: PrepareBillingPortalActionInput,
  ): Promise<PreparedBillingPortalAction> {
    return {
      gateway: this.definition,
      action: input.action,
      portalUrl: buildPlaceholderUrl("portal", {
        gateway: this.definition.key,
        action: input.action,
        subscription: input.currentSubscription?.id ?? "sem-assinatura",
      }),
      message: `${this.definition.name} foi resolvido para a acao ${input.action}. Quando conectarmos o gateway, essa mesma chamada podera abrir o portal ou executar a operacao real.`,
      isLive: false,
      metadata: {
        subscriptionId: input.currentSubscription?.id ?? null,
        providerSubscriptionId: input.currentSubscription?.provider_subscription_id ?? null,
        ...input.metadata,
      },
    };
  }
}

const gatewayAdapters = new Map<BillingGatewayKey, BillingGatewayAdapter>(
  gatewayDefinitions.map((definition) => [definition.key, new PlaceholderBillingGatewayAdapter(definition)]),
);

export function listBillingGatewayDefinitions() {
  return [...gatewayDefinitions].sort((left, right) => {
    if (left.key === PRIMARY_BILLING_GATEWAY_KEY) return -1;
    if (right.key === PRIMARY_BILLING_GATEWAY_KEY) return 1;
    return left.name.localeCompare(right.name, "pt-BR");
  });
}

export function resolveBillingGatewayKey(
  preferred?: BillingGatewayKey | null,
  currentProvider?: string | null,
) {
  if (preferred && gatewayAdapters.has(preferred)) {
    return preferred;
  }

  const normalizedCurrentProvider = currentProvider?.trim().toLowerCase() ?? null;
  if (normalizedCurrentProvider && gatewayAdapters.has(normalizedCurrentProvider as BillingGatewayKey)) {
    return normalizedCurrentProvider as BillingGatewayKey;
  }

  return PRIMARY_BILLING_GATEWAY_KEY;
}

export function getBillingGatewayAdapter(key?: BillingGatewayKey | null, currentProvider?: string | null) {
  const resolvedKey = resolveBillingGatewayKey(key, currentProvider);
  return gatewayAdapters.get(resolvedKey)!;
}

export async function prepareCheckoutSession(input: PrepareCheckoutSessionInput) {
  const adapter = getBillingGatewayAdapter(input.gateway, input.currentSubscription?.provider ?? null);
  return adapter.prepareCheckoutSession({
    ...input,
    gateway: adapter.definition.key,
  });
}

export async function prepareBillingPortalAction(input: PrepareBillingPortalActionInput) {
  const adapter = getBillingGatewayAdapter(input.gateway, input.currentSubscription?.provider ?? null);
  return adapter.prepareBillingPortalAction({
    ...input,
    gateway: adapter.definition.key,
  });
}
