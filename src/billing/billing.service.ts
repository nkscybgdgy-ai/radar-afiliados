import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { SessionUser } from "@/auth/provider";
import { schema, type Db } from "@/db";
import type { BillingEvent, BillingProvider, BillingType } from "./provider";

export type Plan = "free" | "pro";
const PERIOD_DAYS = 30;

export type WebhookResult = "applied" | "duplicate" | "ignored" | "unauthorized";

export class BillingService {
  constructor(
    private readonly db: Db,
    private readonly provider: BillingProvider,
    private readonly priceCents: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  get providerKind() {
    return this.provider.kind;
  }

  async startCheckout(user: SessionUser, billingType: BillingType, cpfCnpj?: string) {
    const created = await this.provider.createSubscription({ user, billingType, priceCents: this.priceCents, cpfCnpj });
    await this.db.insert(schema.subscriptions).values({
      id: randomUUID(),
      userId: user.id,
      provider: this.provider.kind,
      providerCustomerId: created.customerId,
      providerSubscriptionId: created.subscriptionId,
      status: "pending",
      billingType,
      priceCents: this.priceCents,
    });
    return created;
  }

  /** Assinatura mais recente do usuário (qualquer status). */
  async latestSubscription(userId: string) {
    const rows = await this.db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, userId))
      .orderBy(desc(schema.subscriptions.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  async planFor(userId: string): Promise<Plan> {
    const rows = await this.db
      .select()
      .from(schema.subscriptions)
      .where(and(eq(schema.subscriptions.userId, userId), eq(schema.subscriptions.status, "active")));
    const now = this.now();
    return rows.some((s) => !s.currentPeriodEnd || s.currentPeriodEnd > now) ? "pro" : "free";
  }

  async cancel(userId: string) {
    const sub = await this.latestSubscription(userId);
    if (!sub || sub.status === "canceled") return;
    await this.provider.cancelSubscription(sub.providerSubscriptionId);
    await this.db.update(schema.subscriptions).set({ status: "canceled" }).where(eq(schema.subscriptions.id, sub.id));
  }

  /** Caminho único de webhook: o real e o simulado passam por aqui. */
  async handleWebhook(getHeader: (name: string) => string | null | undefined, body: unknown): Promise<WebhookResult> {
    if (!this.provider.verifyWebhook(getHeader)) return "unauthorized";
    const event = this.provider.parseWebhook(body);
    if (!event) return "ignored";
    return this.applyEvent(event, body);
  }

  private async applyEvent(event: BillingEvent, raw: unknown): Promise<WebhookResult> {
    return this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(schema.billingEvents)
        .values({ id: event.id, type: event.type, payload: raw as object })
        .onConflictDoNothing()
        .returning({ id: schema.billingEvents.id });
      if (inserted.length === 0) return "duplicate";

      const where = and(
        eq(schema.subscriptions.provider, this.provider.kind),
        eq(schema.subscriptions.providerSubscriptionId, event.providerSubscriptionId),
      );
      const found = await tx.select().from(schema.subscriptions).where(where).limit(1);
      if (found.length === 0) return "ignored";

      // Assinatura cancelada não ressuscita por evento de pagamento atrasado.
      if (found[0]!.status === "canceled" && event.type !== "subscription_canceled") return "ignored";

      if (event.type === "payment_confirmed") {
        const end = new Date(event.occurredAt.getTime() + PERIOD_DAYS * 86_400_000);
        await tx.update(schema.subscriptions).set({ status: "active", currentPeriodEnd: end }).where(where);
      } else if (event.type === "payment_overdue") {
        await tx.update(schema.subscriptions).set({ status: "overdue" }).where(where);
      } else {
        await tx.update(schema.subscriptions).set({ status: "canceled" }).where(where);
      }
      return "applied";
    });
  }
}
