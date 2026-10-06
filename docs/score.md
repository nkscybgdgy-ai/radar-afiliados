# Score de oportunidade

Implementação: `src/domain/scoring/` (config em `config.ts`). Função pura: recebe `ScoreInput[]`, devolve `ScoreResult[]`.

```
score = 0,30·Demanda + 0,25·Comissão + 0,25·Tendência + 0,20·Confiabilidade   (arredondado, 0–100)
```

| Componente | Cálculo |
|---|---|
| Demanda | percentil de `vendas_30d` no nicho |
| Comissão | `0,6·percentil(comissão R$) + 0,4·percentil(comissão %)`; comissão R$ = preço × % |
| Tendência | `g = (v7/7 + 0,5) / (v30/30 + 0,5)`, limitado a [0,5; 3,0]. Estável (g=1) → **50 (neutro)**; queda desce linear até 0 em g=0,5; crescimento sobe linear até 100 em g=3,0 |
| Confiabilidade | `0,5·nota_ajustada + 0,3·confiança_avaliações + 0,2·selo` |

Percentil = posto médio dentro do nicho (empates no meio; cohort de 1 → 50).

## Travas e etiquetas

| Regra | Efeito |
|---|---|
| Nota ajustada < 4,0 | score ≤ 59 (`nota baixa`) |
| `vendas_30d` < 20 | score ≤ 49 (`sem demanda comprovada`) |
| Avaliações < 10 | **etiqueta "produto novo"; não limita o score** |

## Faixas
80–100 Excelente · 60–79 Boa · 40–59 Mediana · 0–39 Evitar

## Evolução futura
Concorrência entre afiliados: ainda sem fonte de dados. Quando existir, entra como novo componente ou penalidade; os pesos serão renormalizados e este documento atualizado.
