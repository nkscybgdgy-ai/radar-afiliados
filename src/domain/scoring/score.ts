import type { ShopBadge } from "../types";
import { SCORE_CONFIG, type ScoreConfig } from "./config";

/** Tudo que o score precisa saber de um produto. Sem I/O, sem saber a origem. */
export interface ScoreInput {
  id: string;
  commissionCents: number;
  /** Fração: 0.12 = 12%. */
  commissionRate: number;
  sales30d: number;
  sales7d: number;
  rating: number;
  ratingCount: number;
  shopBadge: ShopBadge;
}

export interface ScoreBreakdown {
  demand: number;
  commission: number;
  trend: number;
  reliability: number;
}

export type ScoreLabel = "produto novo";
export type ScoreCap = "nota baixa" | "sem demanda comprovada";

export interface ScoreResult {
  id: string;
  /** 0–100, inteiro. */
  score: number;
  band: string;
  breakdown: ScoreBreakdown;
  /** Nota ajustada (bayesiana), 0–5. */
  adjustedRating: number;
  /** Razão de crescimento 7d vs 30d usada na tendência. */
  growth: number;
  labels: ScoreLabel[];
  caps: ScoreCap[];
}

/** Valores ordenados do cohort, para cálculo de percentil. */
export interface Cohort {
  commissionCents: number[];
  commissionRate: number[];
  sales30d: number[];
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Percentil por posto médio, 0–100. Cohort vazio ou unitário → 50. */
export function percentileRank(sortedAsc: number[], value: number): number {
  const n = sortedAsc.length;
  if (n <= 1) return 50;
  let below = 0;
  let equal = 0;
  for (const v of sortedAsc) {
    if (v < value) below++;
    else if (v === value) equal++;
  }
  return ((below + Math.max(0, equal - 1) / 2) / (n - 1)) * 100;
}

const asc = (xs: number[]) => [...xs].sort((a, b) => a - b);

export function buildCohort(inputs: ScoreInput[]): Cohort {
  return {
    commissionCents: asc(inputs.map((i) => i.commissionCents)),
    commissionRate: asc(inputs.map((i) => i.commissionRate)),
    sales30d: asc(inputs.map((i) => i.sales30d)),
  };
}

export function adjustedRating(
  rating: number,
  count: number,
  cfg: ScoreConfig["reliability"] = SCORE_CONFIG.reliability,
): number {
  const m = cfg.priorWeight;
  return (count * rating + m * cfg.priorMean) / (count + m);
}

export function growthRatio(
  sales7d: number,
  sales30d: number,
  cfg: ScoreConfig["trend"] = SCORE_CONFIG.trend,
): number {
  const g = (sales7d / 7 + cfg.k) / (sales30d / 30 + cfg.k);
  return clamp(g, cfg.gMin, cfg.gMax);
}

/** Estável (g=1) → 50; queda desce até 0 em gMin; crescimento sobe até 100 em gMax. */
export function trendScore(g: number, cfg: ScoreConfig["trend"] = SCORE_CONFIG.trend): number {
  const x = clamp(g, cfg.gMin, cfg.gMax);
  return x <= 1
    ? ((x - cfg.gMin) / (1 - cfg.gMin)) * 50
    : 50 + ((x - 1) / (cfg.gMax - 1)) * 50;
}

export function bandFor(score: number, cfg: ScoreConfig = SCORE_CONFIG): string {
  return (cfg.bands.find((b) => score >= b.min) ?? cfg.bands[cfg.bands.length - 1]!).label;
}

export function scoreProduct(
  input: ScoreInput,
  cohort: Cohort,
  cfg: ScoreConfig = SCORE_CONFIG,
): ScoreResult {
  const demand = percentileRank(cohort.sales30d, input.sales30d);

  const commission =
    cfg.commission.brlShare * percentileRank(cohort.commissionCents, input.commissionCents) +
    cfg.commission.rateShare * percentileRank(cohort.commissionRate, input.commissionRate);

  const g = growthRatio(input.sales7d, input.sales30d, cfg.trend);
  const trend = trendScore(g, cfg.trend);

  const r = cfg.reliability;
  const adjRating = adjustedRating(input.rating, input.ratingCount, r);
  const ratingScore = clamp(((adjRating - r.ratingFloor) / (r.ratingCeil - r.ratingFloor)) * 100, 0, 100);
  const reviewsScore =
    clamp(Math.log10(Math.max(1, input.ratingCount)) / Math.log10(r.reviewsSaturation), 0, 1) * 100;
  const reliability =
    r.ratingShare * ratingScore + r.reviewsShare * reviewsScore + r.badgeShare * r.badgeScore[input.shopBadge];

  const w = cfg.weights;
  let score = w.demand * demand + w.commission * commission + w.trend * trend + w.reliability * reliability;

  const caps: ScoreCap[] = [];
  if (adjRating < cfg.gates.lowRating.below) {
    score = Math.min(score, cfg.gates.lowRating.cap);
    caps.push("nota baixa");
  }
  if (input.sales30d < cfg.gates.minDemand.minSales30d) {
    score = Math.min(score, cfg.gates.minDemand.cap);
    caps.push("sem demanda comprovada");
  }

  const final = Math.round(clamp(score, 0, 100));
  const labels: ScoreLabel[] = input.ratingCount < cfg.newProduct.maxRatingCount ? ["produto novo"] : [];

  return {
    id: input.id,
    score: final,
    band: bandFor(final, cfg),
    breakdown: {
      demand: Math.round(demand),
      commission: Math.round(commission),
      trend: Math.round(trend),
      reliability: Math.round(reliability),
    },
    adjustedRating: adjRating,
    growth: g,
    labels,
    caps,
  };
}

/** Pontua um conjunto de produtos uns contra os outros (percentis dentro do conjunto). */
export function scoreAll(inputs: ScoreInput[], cfg: ScoreConfig = SCORE_CONFIG): ScoreResult[] {
  const cohort = buildCohort(inputs);
  return inputs.map((i) => scoreProduct(i, cohort, cfg));
}
