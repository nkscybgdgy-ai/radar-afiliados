import { describe, expect, it } from "vitest";
import { createProductSource } from "@/data";
import { HOME_CATEGORIES, RawProductSchema, RawShopSchema } from "@/domain/types";
import { MockProductSource } from "./mock-source";

describe("MockProductSource", () => {
  const src = new MockProductSource();

  it("é determinístico", async () => {
    const a = await new MockProductSource().listProducts({ limit: 100 });
    const b = await new MockProductSource().listProducts({ limit: 100 });
    expect(a).toEqual(b);
  });

  it("todos os produtos passam no schema e cobrem as 5 categorias", async () => {
    const { items } = await src.listProducts({ limit: 200 });
    expect(items.length).toBe(60);
    items.forEach((p) => expect(RawProductSchema.parse(p)).toBeTruthy());
    expect(new Set(items.map((p) => p.category))).toEqual(new Set(HOME_CATEGORIES));
    expect(items.every((p) => p.source === "mock")).toBe(true);
  });

  it("paginação percorre tudo sem repetir", async () => {
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await src.listProducts({ limit: 25, cursor });
      seen.push(...page.items.map((p) => p.id));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(seen.length).toBe(60);
    expect(new Set(seen).size).toBe(60);
  });

  it("filtra por categoria", async () => {
    const { items } = await src.listProducts({ category: "cozinha", limit: 100 });
    expect(items.length).toBe(12);
    expect(items.every((p) => p.category === "cozinha")).toBe(true);
  });

  it("lojas válidas e referenciadas existem", async () => {
    const { items } = await src.listProducts({ limit: 100 });
    for (const p of items) {
      const shop = await src.getShop(p.shopId);
      expect(shop && RawShopSchema.parse(shop)).toBeTruthy();
    }
  });

  it("histórico: 30 dias, ordenado, sem negativos", async () => {
    const h = await src.getSalesHistory("coz-001", 30);
    expect(h).toHaveLength(30);
    expect([...h].map((d) => d.date)).toEqual(h.map((d) => d.date).sort());
    expect(h.every((d) => d.sales >= 0)).toBe(true);
  });

  it("id inexistente → null / vazio", async () => {
    expect(await src.getProduct("nope")).toBeNull();
    expect(await src.getSalesHistory("nope", 30)).toEqual([]);
  });
});

describe("createProductSource", () => {
  it("mock por padrão; shopee ainda não implementado", () => {
    expect(createProductSource({ DATA_SOURCE: "mock" })).toBeInstanceOf(MockProductSource);
    expect(() => createProductSource({ DATA_SOURCE: "shopee" }).listProducts({ limit: 1 })).toThrow(/aguardando acesso/);
  });
});
