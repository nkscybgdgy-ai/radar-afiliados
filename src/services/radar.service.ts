import type { ProductSource } from "@/data";
import { scoreAll, type ScoreInput, type ScoreResult } from "@/domain/scoring";
import { commissionCents, type HomeCategory, type RawProduct, type RawShop } from "@/domain/types";

export type RadarSort = "score" | "sales" | "trend";

export interface RadarItem {
  product: RawProduct;
  commissionCents: number;
  sales30d: number;
  sales7d: number;
  score: ScoreResult;
}

export interface ProductSheet extends RadarItem {
  shop: RawShop | null;
}

const sum = (xs: { sales: number }[]) => xs.reduce((a, x) => a + x.sales, 0);

async function listAll(source: ProductSource): Promise<RawProduct[]> {
  const out: RawProduct[] = [];
  let cursor: string | undefined;
  do {
    const page = await source.listProducts({ limit: 50, cursor });
    out.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return out;
}

export class RadarService {
  constructor(private readonly source: ProductSource) {}

  private async build(products: RawProduct[], shops: Map<string, RawShop | null>) {
    const rows = await Promise.all(
      products.map(async (product) => {
        const history = await this.source.getSalesHistory(product.id, 30);
        return { product, sales30d: sum(history), sales7d: sum(history.slice(-7)) };
      }),
    );
    const inputs: ScoreInput[] = rows.map((r) => ({
      id: r.product.id,
      commissionCents: commissionCents(r.product),
      commissionRate: r.product.commissionRate,
      sales30d: r.sales30d,
      sales7d: r.sales7d,
      rating: r.product.ratingStar,
      ratingCount: r.product.ratingCount,
      shopBadge: shops.get(r.product.shopId)?.badge ?? "regular",
    }));
    const scores = new Map(scoreAll(inputs).map((s) => [s.id, s]));
    return rows.map((r): RadarItem => ({
      product: r.product,
      commissionCents: commissionCents(r.product),
      sales30d: r.sales30d,
      sales7d: r.sales7d,
      score: scores.get(r.product.id)!,
    }));
  }

  private async shopsFor(products: RawProduct[]) {
    const ids = [...new Set(products.map((p) => p.shopId))];
    const shops = await Promise.all(ids.map(async (id) => [id, await this.source.getShop(id)] as const));
    return new Map(shops);
  }

  /**
   * Radar do nicho. O score sempre é calculado contra o nicho inteiro (todas as categorias),
   * e só depois filtrado por categoria, para o mesmo produto ter o mesmo score em qualquer tela.
   */
  async getRadar(opts: { category?: HomeCategory; sortBy?: RadarSort; limit?: number } = {}): Promise<RadarItem[]> {
    const products = await listAll(this.source);
    const scored = await this.build(products, await this.shopsFor(products));
    const items = opts.category ? scored.filter((i) => i.product.category === opts.category) : scored;
    const key: Record<RadarSort, (i: RadarItem) => number> = {
      score: (i) => i.score.score,
      sales: (i) => i.sales30d,
      trend: (i) => i.score.growth,
    };
    const k = key[opts.sortBy ?? "score"];
    items.sort((a, b) => k(b) - k(a) || a.product.id.localeCompare(b.product.id));
    return opts.limit ? items.slice(0, opts.limit) : items;
  }

  /** Ficha: o score é calculado contra o nicho inteiro, não isolado. */
  async getProductSheet(id: string): Promise<ProductSheet | null> {
    const product = await this.source.getProduct(id);
    if (!product) return null;
    const all = await listAll(this.source);
    const items = await this.build(all, await this.shopsFor(all));
    const item = items.find((i) => i.product.id === id);
    if (!item) return null;
    return { ...item, shop: await this.source.getShop(product.shopId) };
  }
}
