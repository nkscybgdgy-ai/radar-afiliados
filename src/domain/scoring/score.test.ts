import { describe, expect, it } from "vitest";
import { SCORE_CONFIG } from "./config";
import { adjustedRating, buildCohort, growthRatio, percentileRank, scoreAll, scoreProduct, type ScoreInput } from "./score";

const base: ScoreInput = {
  id: "x", commissionCents: 1000, commissionRate: 0.1, sales30d: 300, sales7d: 70,
  rating: 4.8, ratingCount: 500, shopBadge: "official",
};
const mk = (o: Partial<ScoreInput>): ScoreInput => ({ ...base, ...o });

describe("config", () => {
  it("pesos somam 1", () => {
    const w = SCORE_CONFIG.weights;
    expect(w.demand + w.commission + w.trend + w.reliability).toBeCloseTo(1);
  });
  it("sub-pesos somam 1", () => {
    const { commission: c, reliability: r } = SCORE_CONFIG;
    expect(c.brlShare + c.rateShare).toBeCloseTo(1);
    expect(r.ratingShare + r.reviewsShare + r.badgeShare).toBeCloseTo(1);
  });
});

describe("percentileRank", () => {
  it("min=0, max=100, empates no meio", () => {
    expect(percentileRank([1, 2, 3], 1)).toBe(0);
    expect(percentileRank([1, 2, 3], 3)).toBe(100);
    expect(percentileRank([5, 5, 5], 5)).toBe(50);
  });
  it("cohort unitário → 50", () => expect(percentileRank([7], 7)).toBe(50));
});

describe("growthRatio", () => {
  it("ritmo estável → g ≈ 1", () => expect(growthRatio(70, 300)).toBeCloseTo(1, 0));
  it("limita em [gMin, gMax]", () => {
    expect(growthRatio(10000, 10)).toBe(SCORE_CONFIG.trend.gMax);
    expect(growthRatio(0, 3000)).toBe(SCORE_CONFIG.trend.gMin);
  });
  it("suavização: 2 vendas num produto minúsculo não dispara", () => {
    expect(growthRatio(2, 2)).toBeLessThan(1.5);
  });
});

describe("adjustedRating", () => {
  it("poucas avaliações puxam para o prior", () => {
    expect(adjustedRating(5, 1)).toBeLessThan(4.6);
    expect(adjustedRating(5, 5000)).toBeGreaterThan(4.98);
  });
});

describe("scoreProduct", () => {
  const cohort = buildCohort([mk({ id: "a", sales30d: 50, commissionCents: 200 }), base, mk({ id: "b", sales30d: 900, commissionCents: 3000 })]);

  it("score é inteiro em 0–100 e tem faixa", () => {
    const r = scoreProduct(base, cohort);
    expect(Number.isInteger(r.score)).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.band).toBeTruthy();
  });

  it("mais vendas e mais comissão → score maior", () => {
    const low = scoreProduct(mk({ sales30d: 50, commissionCents: 200 }), cohort).score;
    const high = scoreProduct(mk({ sales30d: 900, commissionCents: 3000 }), cohort).score;
    expect(high).toBeGreaterThan(low);
  });

  it("trava de nota baixa limita em 59", () => {
    const r = scoreProduct(mk({ rating: 3.0, ratingCount: 2000, sales30d: 900, sales7d: 400, commissionCents: 3000 }), cohort);
    expect(r.caps).toContain("nota baixa");
    expect(r.score).toBeLessThanOrEqual(59);
  });

  it("poucas avaliações: etiqueta 'produto novo' e NENHUMA trava", () => {
    const r = scoreProduct(mk({ ratingCount: 3, rating: 5, sales30d: 900, sales7d: 400, commissionCents: 3000 }), cohort);
    expect(r.labels).toEqual(["produto novo"]);
    expect(r.caps).toEqual([]);
  });

  it("produto novo não é penalizado a ponto de ser limitado: pode passar de 59", () => {
    const r = scoreProduct(mk({ ratingCount: 3, rating: 5, sales30d: 900, sales7d: 700, commissionCents: 3000, commissionRate: 0.2 }), cohort);
    expect(r.score).toBeGreaterThan(59);
  });

  it("produto com muitas avaliações não recebe etiqueta", () => {
    expect(scoreProduct(base, cohort).labels).toEqual([]);
  });

  it("sem demanda mínima limita em 49", () => {
    const r = scoreProduct(mk({ sales30d: 5, sales7d: 5, commissionCents: 3000 }), cohort);
    expect(r.caps).toContain("sem demanda comprovada");
    expect(r.score).toBeLessThanOrEqual(49);
  });

  it("faixas", () => {
    const bands = scoreAll([mk({ id: "1" })]).map((r) => r.band);
    expect(["Excelente", "Boa", "Mediana", "Evitar"]).toContain(bands[0]);
  });
});
