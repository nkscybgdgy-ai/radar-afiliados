import { and, eq, sql } from "drizzle-orm";
import type { Plan } from "@/billing/billing.service";
import { schema, type Db } from "@/db";
import { todayBR } from "@/lib/dates";

export interface Limits {
  freeRadarLimit: number;
  freeSheetsPerDay: number;
}

export interface SheetAccess {
  allowed: boolean;
  /** Fichas distintas vistas hoje (inclui esta, se permitida). */
  used: number;
  limit: number | null;
}

export class EntitlementsService {
  constructor(
    private readonly db: Db,
    private readonly limits: Limits,
    private readonly now: () => Date = () => new Date(),
  ) {}

  radarLimit(plan: Plan): number | null {
    return plan === "pro" ? null : this.limits.freeRadarLimit;
  }

  canSeeBreakdown(plan: Plan): boolean {
    return plan === "pro";
  }

  /**
   * Consome uma ficha do dia. Rever a mesma ficha no mesmo dia não gasta outra.
   * Plano pago: ilimitado (não registra).
   */
  async consumeSheet(userId: string, plan: Plan, productId: string): Promise<SheetAccess> {
    if (plan === "pro") return { allowed: true, used: 0, limit: null };
    const day = todayBR(this.now());
    const limit = this.limits.freeSheetsPerDay;
    return this.db.transaction(async (tx) => {
      const today = await tx
        .select({ productId: schema.sheetViews.productId })
        .from(schema.sheetViews)
        .where(and(eq(schema.sheetViews.userId, userId), eq(schema.sheetViews.day, day)));
      if (today.some((r) => r.productId === productId)) return { allowed: true, used: today.length, limit };
      if (today.length >= limit) return { allowed: false, used: today.length, limit };
      await tx.insert(schema.sheetViews).values({ userId, productId, day }).onConflictDoNothing();
      return { allowed: true, used: today.length + 1, limit };
    });
  }

  async sheetsUsedToday(userId: string): Promise<number> {
    const day = todayBR(this.now());
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.sheetViews)
      .where(and(eq(schema.sheetViews.userId, userId), eq(schema.sheetViews.day, day)));
    return row?.n ?? 0;
  }
}
