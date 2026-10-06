import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Plan } from "@/billing/billing.service";
import { schema, type Db } from "@/db";
import { TemplateCaptionGenerator, type CaptionGenerator, type Tone } from "@/domain/generator/caption";
import type { HomeCategory } from "@/domain/types";
import { todayBR } from "@/lib/dates";
import type { RadarService } from "@/services/radar.service";
import type { AffiliateLinkProvider } from "./links";

export type PinRow = typeof schema.generatedPins.$inferSelect;

export type GenerateResult =
  | { status: "ok"; pin: PinRow; used: number; limit: number | null }
  | { status: "limit"; used: number; limit: number }
  | { status: "not_found" };

export class GeneratorService {
  constructor(
    private readonly db: Db,
    private readonly radar: RadarService,
    private readonly links: AffiliateLinkProvider,
    private readonly freePerDay: number,
    private readonly now: () => Date = () => new Date(),
    private readonly captions: CaptionGenerator = new TemplateCaptionGenerator(),
  ) {}

  /**
   * Gera (ou atualiza) o pin do produto no dia. Plano grátis: `freePerDay` produtos distintos por dia;
   * trocar o tom do mesmo produto no mesmo dia não gasta outro. Pro: ilimitado.
   */
  async generate(userId: string, plan: Plan, productId: string, tone: Tone): Promise<GenerateResult> {
    const sheet = await this.radar.getProductSheet(productId);
    if (!sheet) return { status: "not_found" };

    const day = todayBR(this.now());
    const todayRows = await this.db
      .select()
      .from(schema.generatedPins)
      .where(and(eq(schema.generatedPins.userId, userId), eq(schema.generatedPins.day, day)));
    const existing = todayRows.find((r) => r.productId === productId);
    const others = todayRows.filter((r) => r.productId !== productId).length;
    if (plan !== "pro" && !existing && others >= this.freePerDay) {
      return { status: "limit", used: others, limit: this.freePerDay };
    }

    const p = sheet.product;
    const id = existing?.id ?? randomUUID();
    const subIds = ["pinterest", p.category, id.slice(0, 8)];
    // Reaproveita o link do dia: um link novo por troca de tom bagunçaria o rastreio.
    const affiliateUrl = existing?.affiliateUrl ?? (await this.links.createLink({ productUrl: p.productUrl, subIds })).url;
    const caption = await this.captions.generate({
      productId: p.id,
      name: p.name,
      category: p.category,
      priceCents: p.priceCents,
      rating: p.ratingStar,
      ratingCount: p.ratingCount,
      sales30d: sheet.sales30d,
      tone,
    });

    const values = {
      id,
      userId,
      productId,
      day,
      tone,
      affiliateUrl,
      subIds,
      title: caption.title,
      description: caption.description,
      hashtags: caption.hashtags,
      productName: p.name,
      category: p.category,
      priceCents: p.priceCents,
      ratingX10: Math.round(p.ratingStar * 10),
      ratingCount: p.ratingCount,
    };

    // Trava por usuário: duas gerações simultâneas não furam o limite do plano grátis.
    return this.db.transaction(async (tx): Promise<GenerateResult> => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
      const rows = await tx
        .select({ productId: schema.generatedPins.productId })
        .from(schema.generatedPins)
        .where(and(eq(schema.generatedPins.userId, userId), eq(schema.generatedPins.day, day)));
      const used = rows.filter((r) => r.productId !== productId).length;
      if (plan !== "pro" && !rows.some((r) => r.productId === productId) && used >= this.freePerDay) {
        return { status: "limit", used, limit: this.freePerDay };
      }
      const [pin] = await tx
        .insert(schema.generatedPins)
        .values(values)
        .onConflictDoUpdate({
          target: [schema.generatedPins.userId, schema.generatedPins.productId, schema.generatedPins.day],
          set: { tone, title: values.title, description: values.description, hashtags: values.hashtags, priceCents: values.priceCents, productName: values.productName, ratingX10: values.ratingX10, ratingCount: values.ratingCount },
        })
        .returning();
      return { status: "ok", pin: pin!, used: used + 1, limit: plan === "pro" ? null : this.freePerDay };
    });
  }

  /** Pin de hoje deste produto, se já foi gerado. */
  async todayPin(userId: string, productId: string): Promise<PinRow | null> {
    const rows = await this.db
      .select()
      .from(schema.generatedPins)
      .where(and(eq(schema.generatedPins.userId, userId), eq(schema.generatedPins.productId, productId), eq(schema.generatedPins.day, todayBR(this.now()))))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Só o dono enxerga o pin (a imagem é servida a partir daqui). */
  async getOwnedPin(userId: string, pinId: string): Promise<PinRow | null> {
    const rows = await this.db
      .select()
      .from(schema.generatedPins)
      .where(and(eq(schema.generatedPins.id, pinId), eq(schema.generatedPins.userId, userId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async history(userId: string, limit = 30): Promise<PinRow[]> {
    return this.db
      .select()
      .from(schema.generatedPins)
      .where(eq(schema.generatedPins.userId, userId))
      .orderBy(desc(schema.generatedPins.createdAt))
      .limit(limit);
  }

  async usedToday(userId: string): Promise<number> {
    const rows = await this.db
      .select({ id: schema.generatedPins.id })
      .from(schema.generatedPins)
      .where(and(eq(schema.generatedPins.userId, userId), eq(schema.generatedPins.day, todayBR(this.now()))));
    return rows.length;
  }
}

