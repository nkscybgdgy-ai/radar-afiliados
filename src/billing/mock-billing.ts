import { randomUUID } from "node:crypto";
import { parseAsaasWebhook } from "./asaas-webhook";
import type { BillingProvider } from "./provider";

export const MOCK_WEBHOOK_TOKEN = "mock-webhook-token";

/**
 * Asaas SIMULADO: não faz nenhuma chamada de rede. A página /checkout/simulado/[id] dispara
 * webhooks no formato do Asaas pelo MESMO caminho do real (BillingService.handleWebhook).
 */
export class MockBillingProvider implements BillingProvider {
  readonly kind = "mock" as const;

  async createSubscription() {
    const subscriptionId = `sub_mock_${randomUUID().slice(0, 8)}`;
    return {
      customerId: `cus_mock_${randomUUID().slice(0, 8)}`,
      subscriptionId,
      checkoutUrl: `/checkout/simulado/${subscriptionId}`,
    };
  }

  async cancelSubscription() {}

  verifyWebhook(getHeader: (name: string) => string | null | undefined) {
    return getHeader("asaas-access-token") === MOCK_WEBHOOK_TOKEN;
  }

  parseWebhook(body: unknown) {
    return parseAsaasWebhook(body);
  }
}
