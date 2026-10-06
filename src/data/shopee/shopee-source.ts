import type { ProductSource } from "../source";

const NOT_READY =
  "Adapter da Shopee ainda não implementado: aguardando acesso à API do programa de afiliados. " +
  "Use DATA_SOURCE=mock. Scraping é proibido neste projeto.";

/**
 * Stub. Quando houver acesso: mapear a resposta da API oficial para RawProduct/RawShop
 * (validando com RawProductSchema) e compor getSalesHistory com os snapshots do banco.
 */
export class ShopeeProductSource implements ProductSource {
  listProducts(): never { throw new Error(NOT_READY); }
  getProduct(): never { throw new Error(NOT_READY); }
  getShop(): never { throw new Error(NOT_READY); }
  getSalesHistory(): never { throw new Error(NOT_READY); }
}
