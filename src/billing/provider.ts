import type { SessionUser } from "@/auth/provider";

export type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD";
export const BILLING_TYPES: readonly BillingType[] = ["PIX", "BOLETO", "CREDIT_CARD"];

/** Evento normalizado, independente do gateway. */
export interface BillingEvent {
  /** Id único do evento no gateway (idempotência). */
  id: string;
  type: "payment_confirmed" | "payment_overdue" | "subscription_canceled";
  providerSubscriptionId: string;
  occurredAt: Date;
}

export interface CreatedSubscription {
  customerId: string;
  subscriptionId: string;
  /** Para onde levar o usuário pagar (Pix/boleto/cartão). */
  checkoutUrl: string;
}

/** Gateway de cobrança. Local: mock com checkout simulado. Real: Asaas. */
export interface BillingProvider {
  readonly kind: "mock" | "asaas";
  createSubscription(input: {
    user: SessionUser;
    billingType: BillingType;
    priceCents: number;
    cpfCnpj?: string;
  }): Promise<CreatedSubscription>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  /** `getHeader` lê um header do webhook (case-insensitive). */
  verifyWebhook(getHeader: (name: string) => string | null | undefined): boolean;
  /** null = evento que não nos interessa. */
  parseWebhook(body: unknown): BillingEvent | null;
}
