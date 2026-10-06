import type { Env } from "@/lib/env";
import { AsaasBillingProvider } from "./asaas-billing";
import { MockBillingProvider } from "./mock-billing";
import type { BillingProvider } from "./provider";

export type { BillingProvider, BillingType, BillingEvent } from "./provider";
export { BILLING_TYPES } from "./provider";

export function createBillingProvider(
  env: Pick<Env, "BILLING_PROVIDER" | "ASAAS_API_KEY" | "ASAAS_BASE_URL" | "ASAAS_WEBHOOK_TOKEN">,
): BillingProvider {
  if (env.BILLING_PROVIDER === "mock") return new MockBillingProvider();
  if (!env.ASAAS_API_KEY || !env.ASAAS_WEBHOOK_TOKEN) {
    throw new Error("ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN são obrigatórios com BILLING_PROVIDER=asaas");
  }
  return new AsaasBillingProvider({ apiKey: env.ASAAS_API_KEY, baseUrl: env.ASAAS_BASE_URL, webhookToken: env.ASAAS_WEBHOOK_TOKEN });
}
