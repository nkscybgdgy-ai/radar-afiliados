import {
  HOME_CATEGORIES,
  RawProductSchema,
  RawShopSchema,
  type DailySales,
  type HomeCategory,
  type Page,
  type RawProduct,
  type RawShop,
} from "@/domain/types";
import type { ListProductsQuery, ProductSource } from "../source";
import { MOCK_NAMES } from "./catalog";
import { hashString } from "@/lib/hash";
import { mulberry32 } from "./rng";

const SEED = 20260101;
const HISTORY_DAYS = 30;
/** Data de referência fixa: dados determinísticos, independentes do relógio. */
const REFERENCE_DATE = "2026-10-06";

type Profile = "star" | "rising" | "steady" | "fading" | "new";
interface MockEntry { product: RawProduct; profile: Profile; dailyBase: number; trend: number }

const pick = <T>(rnd: () => number, xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!;
const between = (rnd: () => number, lo: number, hi: number) => lo + rnd() * (hi - lo);

function buildShops(): RawShop[] {
  const rnd = mulberry32(SEED + 1);
  const names = ["Casa Prática", "Lar & Cia", "Mundo Doméstico", "Ponto da Casa", "Útil Brasil", "CasaFácil", "Vida em Ordem", "Detalhe Decor", "Brilho Total", "Lojão do Lar"];
  return names.map((name, i) => {
    const badge = i < 2 ? "official" : i < 5 ? "preferred" : "regular";
    const rating = Math.round(between(rnd, i === 9 ? 3.4 : 4.1, 5) * 10) / 10;
    return RawShopSchema.parse({ id: `shop-${i + 1}`, name, rating, badge });
  });
}

function buildEntries(shops: RawShop[]): MockEntry[] {
  const rnd = mulberry32(SEED);
  const profiles: Profile[] = ["star", "rising", "steady", "steady", "steady", "fading", "new", "rising"];
  const entries: MockEntry[] = [];
  for (const category of HOME_CATEGORIES) {
    MOCK_NAMES[category].forEach((name, idx) => {
      const profile = profiles[(idx + hashString(category)) % profiles.length]!;
      const priceCents = Math.round(between(rnd, 990, 24990) / 10) * 10;
      const commissionRate = Math.round(between(rnd, 0.04, 0.2) * 100) / 100;
      const dailyBase =
        profile === "star" ? between(rnd, 40, 120)
        : profile === "new" ? between(rnd, 1, 6)
        : between(rnd, 3, 40);
      const trend =
        profile === "rising" ? between(rnd, 1.6, 2.8)
        : profile === "star" ? between(rnd, 1.0, 1.4)
        : profile === "fading" ? between(rnd, 0.4, 0.75)
        : between(rnd, 0.85, 1.15);
      const ratingCount = profile === "new" ? Math.floor(between(rnd, 0, 9)) : Math.floor(between(rnd, 15, 6000) * (dailyBase / 20 + 0.5));
      const ratingStar = Math.round(between(rnd, profile === "fading" ? 3.5 : 4.0, 5) * 10) / 10;
      const shop = pick(rnd, shops);
      const id = `${category.slice(0, 3)}-${String(idx + 1).padStart(3, "0")}`;
      const product = RawProductSchema.parse({
        id,
        name,
        category,
        imageUrl: `mock:${id}`,
        productUrl: `https://shopee.com.br/produto-demo/${id}`,
        priceCents,
        commissionRate,
        salesTotal: Math.round(dailyBase * between(rnd, 60, 400)),
        ratingStar,
        ratingCount,
        shopId: shop.id,
        source: "mock",
      });
      entries.push({ product, profile, dailyBase, trend });
    });
  }
  return entries;
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export class MockProductSource implements ProductSource {
  private shops = buildShops();
  private entries = buildEntries(this.shops);

  async listProducts(q: ListProductsQuery): Promise<Page<RawProduct>> {
    const all = this.entries.map((e) => e.product).filter((p) => !q.category || p.category === q.category);
    const start = q.cursor ? Number.parseInt(q.cursor, 10) : 0;
    if (!Number.isInteger(start) || start < 0) throw new Error("cursor inválido");
    const items = all.slice(start, start + q.limit);
    const next = start + q.limit;
    return { items, nextCursor: next < all.length ? String(next) : null };
  }

  async getProduct(id: string): Promise<RawProduct | null> {
    return this.entries.find((e) => e.product.id === id)?.product ?? null;
  }

  async getShop(id: string): Promise<RawShop | null> {
    return this.shops.find((s) => s.id === id) ?? null;
  }

  async getSalesHistory(productId: string, days: number): Promise<DailySales[]> {
    const entry = this.entries.find((e) => e.product.id === productId);
    if (!entry) return [];
    const n = Math.min(days, HISTORY_DAYS);
    const rnd = mulberry32(SEED ^ hashString(productId));
    const out: DailySales[] = [];
    for (let i = n - 1; i >= 0; i--) {
      // Tendência: a taxa cresce/decai suavemente até chegar a `trend`× nos últimos 7 dias.
      const recent = i < 7 ? 1 : 0;
      const ramp = recent ? entry.trend : 1 + (entry.trend - 1) * Math.max(0, 1 - i / HISTORY_DAYS) * 0.3;
      const noise = between(rnd, 0.8, 1.2);
      out.push({ date: addDays(REFERENCE_DATE, -i), sales: Math.max(0, Math.round(entry.dailyBase * ramp * noise)) });
    }
    return out;
  }
}

export const MOCK_CATEGORIES: readonly HomeCategory[] = HOME_CATEGORIES;
