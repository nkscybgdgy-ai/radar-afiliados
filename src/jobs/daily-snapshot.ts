import { randomUUID } from "node:crypto";
import { and, asc, eq, gte } from "drizzle-orm";
import type { ProductSource } from "@/data";
import { schema, type Db } from "@/db";
import { todayBR } from "@/lib/dates";
import type { DailySales } from "@/domain/types";

export interface SnapshotRunResult {
  day: string;
  products: number;
}

/**
 * Job diário: grava um snapshot de cada produto do nicho. Idempotente por dia
 * (rodar duas vezes no mesmo dia sobrescreve, não duplica).
 * Local: `npm run job:daily`. Produção: um cron chama /api/cron/snapshot.
 */
export class SnapshotJob {
  constructor(
    private readonly db: Db,
    private readonly source: ProductSource,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async run(): Promise<SnapshotRunResult> {
    const day = todayBR(this.now());
    const jobId = randomUUID();
    try {
      let count = 0;
      let cursor: string | undefined;
      do {
        const page = await this.source.listProducts({ limit: 50, cursor });
        for (const p of page.items) {
          const row = {
            productId: p.id,
            day,
            salesTotal: p.salesTotal,
            priceCents: p.priceCents,
            commissionRate: Math.round(p.commissionRate * 10000),
            ratingStar: Math.round(p.ratingStar * 10),
            ratingCount: p.ratingCount,
            source: p.source,
          };
          await this.db
            .insert(schema.productSnapshots)
            .values(row)
            .onConflictDoUpdate({ target: [schema.productSnapshots.productId, schema.productSnapshots.day], set: row });
          count++;
        }
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      await this.db.insert(schema.jobRuns).values({ id: jobId, job: "daily-snapshot", day, status: "ok", detail: `${count} produtos` });
      return { day, products: count };
    } catch (e) {
      await this.db
        .insert(schema.jobRuns)
        .values({ id: jobId, job: "daily-snapshot", day, status: "error", detail: String(e) });
      throw e;
    }
  }
}

/** Vendas por dia derivadas dos snapshots (diferença do acumulado entre dias consecutivos). */
export async function dailySalesFromSnapshots(db: Db, productId: string, days: number, now: Date = new Date()): Promise<DailySales[]> {
  const since = todayBR(new Date(now.getTime() - (days + 1) * 86_400_000));
  const rows = await db
    .select({ day: schema.productSnapshots.day, total: schema.productSnapshots.salesTotal })
    .from(schema.productSnapshots)
    .where(and(eq(schema.productSnapshots.productId, productId), gte(schema.productSnapshots.day, since)))
    .orderBy(asc(schema.productSnapshots.day));
  const out: DailySales[] = [];
  for (let i = 1; i < rows.length; i++) {
    out.push({ date: rows[i]!.day, sales: Math.max(0, rows[i]!.total - rows[i - 1]!.total) });
  }
  return out;
}

