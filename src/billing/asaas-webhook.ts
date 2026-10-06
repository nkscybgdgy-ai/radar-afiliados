import { z } from "zod";
import type { BillingEvent } from "./provider";

/** Formato do webhook do Asaas. Confirmar contra o sandbox antes do lançamento (LANCAMENTO.md). */
const AsaasWebhookSchema = z.object({
  id: z.string(),
  event: z.string(),
  dateCreated: z.string().optional(),
  payment: z.object({ id: z.string(), subscription: z.string().nullish() }).partial({ id: true }).optional(),
  subscription: z.object({ id: z.string() }).optional(),
});

const PAID = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const CANCELED = new Set(["SUBSCRIPTION_DELETED", "SUBSCRIPTION_INACTIVATED"]);

export function parseAsaasWebhook(body: unknown): BillingEvent | null {
  const parsed = AsaasWebhookSchema.safeParse(body);
  if (!parsed.success) return null;
  const { id, event, payment, subscription, dateCreated } = parsed.data;
  const occurredAt = dateCreated && !Number.isNaN(Date.parse(dateCreated)) ? new Date(dateCreated) : new Date();
  const subId = payment?.subscription ?? subscription?.id;
  if (!subId) return null;
  if (PAID.has(event)) return { id, type: "payment_confirmed", providerSubscriptionId: subId, occurredAt };
  if (event === "PAYMENT_OVERDUE") return { id, type: "payment_overdue", providerSubscriptionId: subId, occurredAt };
  if (CANCELED.has(event)) return { id, type: "subscription_canceled", providerSubscriptionId: subId, occurredAt };
  return null;
}
