# Radar de Afiliados — CLAUDE.md

> Status: **plano aprovado.** Camada de dados (mock) e score implementados e testados. Falta: app Next.js, banco, auth, cobrança. Itens marcados com (?) estão em aberto.

## Projeto

Plataforma de inteligência para afiliados da Shopee. Nicho inicial: **produtos para casa**.

**Problema:** afiliados perdem tempo e dinheiro escolhendo produtos errados para divulgar.

**Projeto independente**, em repositório próprio. Sem relação com o `qirion-frontend` (imóveis): nenhum código, dependência ou deploy compartilhado.

## Funcionalidades

| # | Funcionalidade | Fase |
|---|---|---|
| 1 | Radar de produtos mais vendidos e em alta no nicho | **MVP** |
| 2 | Ficha do produto: preço, % comissão, comissão em R$, vendas, nota da loja, avaliações | **MVP** |
| 3 | Score de oportunidade (0–100) | **MVP** |
| 4 | Alertas (disparo de vendas, aumento de comissão) | Pós-MVP |
| 5 | Gerador de link de afiliado + legenda + imagem para Pinterest | Pós-MVP |
| 6 | **Concorrência entre afiliados** (quantos afiliados já divulgam o produto; entra no score como penalidade/componente) | Evolução futura. Depende de fonte de dados que ainda não existe na API oficial; não estimar por scraping |

MVP = só Shopee, só um nicho, funcionalidades 1, 2 e 3.

## Decisões

1. **Fonte de dados oficial: API do programa de afiliados da Shopee.** Ainda sem acesso. **Proibido scraping**, em qualquer fase.
2. **Dados fictícios (mock) numa camada separada.** O resto do app só conhece a interface `ProductSource`. Trocar mock por API real = escrever um adapter novo e mudar uma variável de ambiente (`DATA_SOURCE=mock|shopee`). Nenhuma outra camada pode importar de `src/data/mock` ou `src/data/shopee` diretamente.
3. **Score é função pura** em `src/domain/scoring`, sem I/O, sem saber de onde vêm os dados. Pesos e limites ficam num único arquivo de configuração, com testes.
4. **Histórico próprio.** A API entrega vendas acumuladas, não série temporal. A tendência exige snapshots diários que nós mesmos gravamos (job diário). O mock gera snapshots sintéticos com a mesma forma.
5. **Modelo de negócio:** plano grátis limitado + assinatura mensal.
   - Grátis: Top 10 do radar, 5 fichas/dia, score visível, detalhamento do score bloqueado.
   - Pago: radar completo, filtros, detalhamento do score, exportação.
   - Limites do plano grátis: (?) a definir.
   - **Cobrança: Asaas** (Pix, boleto e cartão). **Preço inicial R$ 39/mês**, configurável por `PLAN_PRICE_CENTS` (centavos; padrão 3900). Nunca fixar o preço no código.
6. **UI e conteúdo em pt-BR.** Moeda BRL.
7. **Sem dados pessoais de terceiros.** Só dados de produto/loja públicos via API oficial.

## Stack proposta

- **Next.js (App Router) + TypeScript** — um único app, sem monorepo.
- **Tailwind CSS** para UI.
- **PostgreSQL** (Supabase ou Neon) + **Drizzle ORM** — produtos, snapshots diários, usuários, assinaturas.
- **Auth:** Supabase Auth (ou Auth.js se for Neon).
- **Pagamento:** Asaas (assinatura recorrente com Pix, boleto e cartão; webhooks em `src/app/api`).
- **Job diário** de snapshot: Vercel Cron / GitHub Actions chamando uma rota protegida.
- **Testes:** Vitest (domínio e adapters) + Playwright (fluxo principal).
- **Lint/format:** ESLint + Prettier. Deploy: Vercel.
- Zod nas fronteiras (resposta de adapter, inputs de rota).

## Estrutura de pastas proposta

```
radar-afiliados/
├── CLAUDE.md
├── docs/
│   └── score.md                 # fórmula do score, com exemplos
├── src/
│   ├── app/                     # rotas Next.js
│   │   ├── (marketing)/         # landing, preços
│   │   ├── (app)/radar/         # funcionalidade 1
│   │   ├── (app)/produto/[id]/  # funcionalidade 2
│   │   ├── (app)/conta/         # plano, cobrança
│   │   └── api/                 # cron de snapshot, webhooks de pagamento
│   ├── domain/                  # puro, sem I/O
│   │   ├── types.ts             # Product, Shop, Snapshot, ScoreBreakdown
│   │   └── scoring/             # score.ts, config.ts, score.test.ts
│   ├── data/                    # ÚNICA camada que fala com fonte externa
│   │   ├── source.ts            # interface ProductSource
│   │   ├── index.ts             # escolhe adapter por DATA_SOURCE
│   │   ├── mock/                # fixtures determinísticas (seed fixa)
│   │   └── shopee/              # adapter real (stub até haver acesso)
│   ├── services/                # radar, ficha, planos/limites (orquestra data + domain)
│   ├── db/                      # schema Drizzle, migrations, repositórios
│   ├── billing/                 # Asaas, entitlements por plano
│   ├── components/
│   └── lib/                     # env, utils
└── tests/e2e/
```

Regra de dependência: `app → services → (data, domain, db)`. `domain` não importa de ninguém.

## Estado da implementação

- `src/domain`: tipos (dinheiro em centavos, Zod) e `scoring/` (puro). Detalhes em `docs/score.md`.
- `src/data`: `ProductSource` + adapter `mock/` (60 produtos, 5 categorias, determinístico) + stub `shopee/` (lança erro até haver acesso).
- `src/services/radar.service.ts`: radar e ficha. O score é **sempre calculado contra o nicho inteiro** e só depois filtrado por categoria, para o mesmo produto ter o mesmo score em qualquer tela.
- Comandos: `npm test`, `npm run typecheck`.

## Interface da camada de dados (contrato)

```ts
interface ProductSource {
  listProducts(q: { niche: string; limit: number; cursor?: string }): Promise<Page<RawProduct>>;
  getProduct(id: string): Promise<RawProduct | null>;
  getShop(id: string): Promise<RawShop | null>;
  getSalesHistory(productId: string, days: number): Promise<DailySales[]>; // vendas/dia, mais antigo primeiro
}
```

`RawProduct` traz: id, nome, categoria, imagem, preço (centavos), % de comissão (fração), vendas acumuladas, nota, nº de avaliações, id da loja. `RawShop`: nota e selo (oficial/preferida/regular). Os campos exatos da API da Shopee devem ser confirmados quando houver acesso; só o adapter muda. O adapter real mapeia o formato da Shopee para esse tipo; o mock devolve o mesmo tipo.

## Fórmula do score de oportunidade (0–100)

Cada componente é normalizado para 0–100, depois combinado por pesos.

```
score = 0.30·Demanda + 0.25·Comissão + 0.25·Tendência + 0.20·Confiabilidade
```

| Componente | Peso | Cálculo |
|---|---|---|
| **Demanda** | 30% | Percentil de `vendas_30d` dentro do nicho (percentil evita limites arbitrários e é robusto a outliers). |
| **Comissão** | 25% | `0,6·percentil(comissão_R$) + 0,4·percentil(comissão_%)`. Comissão em R$ = preço × %; ela pesa mais porque é o que entra no bolso. |
| **Tendência** | 25% | `g = (vendas_7d/7 + k) / (vendas_30d/30 + k)`, com `k` suavizador para produtos de baixo volume não "dispararem" por 2 vendas. `g` limitado a [0,5 ; 3,0]. Estável (g=1) → **50 (neutro)**; queda desce linear até 0 (g=0,5); crescimento sobe linear até 100 (g=3,0). |
| **Confiabilidade** | 20% | `0,5·nota_ajustada + 0,3·confiança_avaliações + 0,2·selo_loja`. `nota_ajustada` é Bayesiana (`(v·R + m·C)/(v+m)`, m=20, C=4,5) mapeada de 3,5→0 a 5,0→100. `confiança_avaliações` = `min(1, log10(avaliações)/log10(500))`. `selo_loja`: oficial 100, preferida 70, regular 0. |

**Travas (gates)**, aplicadas depois da soma:
- Nota ajustada < 4,0 → score máximo 59.
- `vendas_30d` < 20 → score máximo 49 (sem demanda comprovada).
- **Poucas avaliações (< 10) NÃO limitam o score.** O produto só recebe a etiqueta **"produto novo"**. (O prior bayesiano já evita que 1–2 notas altas inflem a confiabilidade.)

**Faixas:** 80–100 Excelente · 60–79 Boa · 40–59 Mediana · 0–39 Evitar.

Pesos, `k`, limites e travas ficam em `src/domain/scoring/config.ts`. São **hipóteses iniciais**: devem ser recalibradas quando houver dados reais (ex.: correlacionar score com resultado real de cliques/conversão dos usuários).

## Convenções

- TypeScript estrito. Sem `any` nas fronteiras.
- Dinheiro em centavos (inteiros) no domínio; formatar só na UI.
- Todo dado de mock é determinístico (seed fixa) e marcado como `source: "mock"`; a UI exibe aviso "dados de demonstração" enquanto `DATA_SOURCE=mock`.
- Qualquer mudança na fórmula atualiza `docs/score.md` e os testes no mesmo commit.
- Segredos só em variáveis de ambiente; `.env.example` versionado, `.env` nunca.

## Nicho "casa": categorias

organização, cozinha, limpeza, banheiro, decoração (`HOME_CATEGORIES` em `src/domain/types.ts`).

## Perguntas em aberto

1. Nome do produto e do domínio (placeholder: `radar-afiliados`).
2. Limites exatos do plano grátis.
3. Calibração dos pesos do score com dados reais. No mock (60 produtos) a distribuição é Boa 20 · Mediana 32 · Evitar 8, máximo 78: nenhum "Excelente" ainda, porque o score usa percentis do nicho e exige topo em quase tudo ao mesmo tempo.
