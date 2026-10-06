import { timingSafeEqual } from "node:crypto";
import { parseAsaasWebhook } from "./asaas-webhook";
import type { BillingProvider } from "./provider";

interface AsaasConfig {
  apiKey: string;
  baseUrl: string;
  webhookToken: string;
  fetchImpl?: typeof fetch;
}

const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Adapter real do Asaas (API v3). Escrito e testado só com fetch falso: NÃO foi exercitado
 * contra o sandbox. Passo obrigatório do LANCAMENTO.md antes de ir para produção.
 */
export class AsaasBillingProvider implements BillingProvider {
  readonly kind = "asaas" as const;
  private readonly f: typeof fetch;
  constructor(private readonly cfg: AsaasConfig) {
    this.f = cfg.fetchImpl ?? fetch;
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.f(`${this.cfg.baseUrl}${path}`, {
      method,
      headers: { "content-type": "application/json", access_token: this.cfg.apiKey, "user-agent": "radar-afiliados" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Asaas ${method} ${path} falhou: ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  }

  async createSubscription(input: Parameters<BillingProvider["createSubscription"]>[0]) {
    const customer = await this.call<{ id: string }>("POST", "/customers", {
      name: input.user.name ?? input.user.email,
      email: input.user.email,
      cpfCnpj: input.cpfCnpj,
      externalReference: input.user.id,
    });
    const nextDueDate = new Date().toISOString().slice(0, 10);
    const sub = await this.call<{ id: string }>("POST", "/subscriptions", {
      customer: customer.id,
      billingType: input.billingType,
      value: input.priceCents / 100,
      nextDueDate,
      cycle: "MONTHLY",
      description: "Assinatura Radar de Afiliados",
      externalReference: input.user.id,
    });
    const payments = await this.call<{ data: { invoiceUrl?: string }[] }>("GET", `/subscriptions/${sub.id}/payments`);
    const checkoutUrl = payments.data[0]?.invoiceUrl;
    if (!checkoutUrl) throw new Error("Asaas não devolveu a URL de pagamento da primeira cobrança");
    return { customerId: customer.id, subscriptionId: sub.id, checkoutUrl };
  }

  async cancelSubscription(subscriptionId: string) {
    await this.call("DELETE", `/subscriptions/${subscriptionId}`);
  }

  verifyWebhook(getHeader: (name: string) => string | null | undefined) {
    const given = getHeader("asaas-access-token");
    return !!given && safeEq(given, this.cfg.webhookToken);
  }

  parseWebhook(body: unknown) {
    return parseAsaasWebhook(body);
  }
}
