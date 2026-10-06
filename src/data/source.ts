import type { DailySales, HomeCategory, Page, RawProduct, RawShop } from "@/domain/types";

export interface ListProductsQuery {
  category?: HomeCategory;
  limit: number;
  cursor?: string;
}

/**
 * Contrato único entre o app e a fonte de dados. O resto do código só conhece esta
 * interface; mock e Shopee são adapters intercambiáveis (DATA_SOURCE).
 *
 * `getSalesHistory` devolve vendas por dia (mais antigo primeiro). No adapter real
 * isso vem dos snapshots diários que nós gravamos, já que a API entrega só o acumulado.
 */
export interface ProductSource {
  listProducts(q: ListProductsQuery): Promise<Page<RawProduct>>;
  getProduct(id: string): Promise<RawProduct | null>;
  getShop(id: string): Promise<RawShop | null>;
  getSalesHistory(productId: string, days: number): Promise<DailySales[]>;
}
