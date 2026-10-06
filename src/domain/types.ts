import { z } from "zod";

export const HOME_CATEGORIES = [
  "organizacao",
  "cozinha",
  "limpeza",
  "banheiro",
  "decoracao",
] as const;
export type HomeCategory = (typeof HOME_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<HomeCategory, string> = {
  organizacao: "Organização",
  cozinha: "Cozinha",
  limpeza: "Limpeza",
  banheiro: "Banheiro",
  decoracao: "Decoração",
};

export const ShopBadgeSchema = z.enum(["official", "preferred", "regular"]);
export type ShopBadge = z.infer<typeof ShopBadgeSchema>;

/** Dinheiro sempre em centavos (inteiro). Comissão como fração: 0.12 = 12%. */
export const RawShopSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Nota da loja, 0–5. */
  rating: z.number().min(0).max(5),
  badge: ShopBadgeSchema,
});
export type RawShop = z.infer<typeof RawShopSchema>;

export const RawProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(HOME_CATEGORIES),
  imageUrl: z.string(),
  priceCents: z.number().int().positive(),
  commissionRate: z.number().min(0).max(1),
  /** Vendas acumuladas informadas pela fonte. */
  salesTotal: z.number().int().nonnegative(),
  /** Nota do produto, 0–5. */
  ratingStar: z.number().min(0).max(5),
  ratingCount: z.number().int().nonnegative(),
  shopId: z.string(),
  source: z.enum(["mock", "shopee"]),
});
export type RawProduct = z.infer<typeof RawProductSchema>;

export interface DailySales {
  /** AAAA-MM-DD */
  date: string;
  sales: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export const commissionCents = (p: Pick<RawProduct, "priceCents" | "commissionRate">): number =>
  Math.round(p.priceCents * p.commissionRate);
