/**
 * Pesos e limites do score. São hipóteses iniciais: recalibrar com dados reais.
 * Qualquer mudança aqui atualiza docs/score.md e os testes no mesmo commit.
 */
export const SCORE_CONFIG = {
  weights: { demand: 0.3, commission: 0.25, trend: 0.25, reliability: 0.2 },

  commission: { brlShare: 0.6, rateShare: 0.4 },

  trend: {
    /** Suavizador (vendas/dia) para produtos de baixo volume não "dispararem". */
    k: 0.5,
    gMin: 0.5,
    gMax: 3.0,
  },

  reliability: {
    ratingShare: 0.5,
    reviewsShare: 0.3,
    badgeShare: 0.2,
    /** Prior bayesiano: m avaliações "virtuais" com nota C. */
    priorWeight: 20,
    priorMean: 4.5,
    /** nota ajustada 3,5 → 0 ; 5,0 → 100 */
    ratingFloor: 3.5,
    ratingCeil: 5.0,
    /** nº de avaliações em que a confiança satura em 100%. */
    reviewsSaturation: 500,
    badgeScore: { official: 100, preferred: 70, regular: 0 },
  },

  gates: {
    /** Nota ajustada abaixo disso limita o score. */
    lowRating: { below: 4.0, cap: 59 },
    /** Sem demanda mínima comprovada o score não passa de `cap`. */
    minDemand: { minSales30d: 20, cap: 49 },
  },

  /** Poucas avaliações: só etiqueta "produto novo", nunca limita o score. */
  newProduct: { maxRatingCount: 10 },

  bands: [
    { min: 80, label: "Excelente" },
    { min: 60, label: "Boa" },
    { min: 40, label: "Mediana" },
    { min: 0, label: "Evitar" },
  ],
} as const;

export type ScoreConfig = typeof SCORE_CONFIG;
