import { hashString } from "@/lib/hash";
import type { Env } from "@/lib/env";

export interface AffiliateLinkProvider {
  readonly kind: "mock" | "shopee";
  /** `subIds` identificam canal/categoria/pin para saber qual divulgação vendeu. */
  createLink(input: { productUrl: string; subIds: string[] }): Promise<{ url: string }>;
}

/**
 * Link FALSO e determinístico. Usa o TLD reservado `.invalid`, que nunca resolve,
 * para ninguém confundir com um link de afiliado real.
 */
export class MockAffiliateLinkProvider implements AffiliateLinkProvider {
  readonly kind = "mock" as const;
  async createLink({ productUrl, subIds }: { productUrl: string; subIds: string[] }) {
    const code = hashString(`${productUrl}|${subIds.join("|")}`).toString(36);
    return { url: `https://afiliado-demo.invalid/s/${code}?sub=${encodeURIComponent(subIds.join("_"))}` };
  }
}

/** Stub: usar a mutation de link curto da Affiliate API da Shopee quando houver acesso (LANCAMENTO.md). */
export class ShopeeAffiliateLinkProvider implements AffiliateLinkProvider {
  readonly kind = "shopee" as const;
  createLink(): never {
    throw new Error("Gerador de link da Shopee ainda não conectado: aguardando acesso à API. Use LINK_PROVIDER=mock.");
  }
}

export function createLinkProvider(env: Pick<Env, "LINK_PROVIDER">): AffiliateLinkProvider {
  return env.LINK_PROVIDER === "shopee" ? new ShopeeAffiliateLinkProvider() : new MockAffiliateLinkProvider();
}
