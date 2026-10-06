import { describe, expect, it } from "vitest";
import { MockProductSource } from "@/data/mock/mock-source";
import { RadarService } from "./radar.service";

describe("RadarService", () => {
  const svc = new RadarService(new MockProductSource());

  it("radar ordenado por score desc", async () => {
    const r = await svc.getRadar();
    expect(r).toHaveLength(60);
    for (let i = 1; i < r.length; i++) expect(r[i - 1]!.score.score).toBeGreaterThanOrEqual(r[i]!.score.score);
  });

  it("score do produto é igual no radar, na categoria e na ficha", async () => {
    const all = await svc.getRadar();
    const top = all[0]!;
    const cat = await svc.getRadar({ category: top.product.category });
    const sheet = await svc.getProductSheet(top.product.id);
    expect(cat.find((i) => i.product.id === top.product.id)!.score.score).toBe(top.score.score);
    expect(sheet!.score.score).toBe(top.score.score);
    expect(sheet!.shop).not.toBeNull();
  });

  it("ordenação por tendência e limite", async () => {
    const r = await svc.getRadar({ sortBy: "trend", limit: 10 });
    expect(r).toHaveLength(10);
    expect(r[0]!.score.growth).toBeGreaterThanOrEqual(r[9]!.score.growth);
  });

  it("produto novo aparece com etiqueta e sem trava", async () => {
    const all = await svc.getRadar();
    const novos = all.filter((i) => i.score.labels.includes("produto novo"));
    expect(novos.length).toBeGreaterThan(0);
    expect(novos.every((i) => !i.score.caps.includes("nota baixa") || i.score.adjustedRating < 4)).toBe(true);
  });

  it("ficha de id inexistente → null", async () => {
    expect(await svc.getProductSheet("nope")).toBeNull();
  });
});
