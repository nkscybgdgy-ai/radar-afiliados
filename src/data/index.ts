import type { Env } from "@/lib/env";
import { MockProductSource } from "./mock/mock-source";
import { ShopeeProductSource } from "./shopee/shopee-source";
import type { ProductSource } from "./source";

export type { ProductSource, ListProductsQuery } from "./source";

/** Único ponto que escolhe o adapter. Nenhuma outra camada importa mock/ ou shopee/. */
export function createProductSource(env: Pick<Env, "DATA_SOURCE">): ProductSource {
  return env.DATA_SOURCE === "shopee" ? new ShopeeProductSource() : new MockProductSource();
}
