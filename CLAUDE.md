# Radar de Afiliados — CLAUDE.md

> Status: **app completo rodando 100% local** (dados mock, banco PGlite, login simulado, Asaas simulado, job diário local). Nenhum serviço externo conectado. Faltam só as integrações reais: ver `LANCAMENTO.md`. Itens marcados com (?) estão em aberto.

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
| 5 | Gerador de link de afiliado + legenda + imagem para Pinterest | **Implementado local** (link mock, legenda por templates, PNG). Publicação automática no Pinterest: fora do escopo |
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
   - Limites do plano grátis (configuráveis): top 10 do radar (`FREE_RADAR_LIMIT`), 5 fichas/dia (`FREE_SHEETS_PER_DAY`). Revisar antes do lançamento.
   - **Cobrança: Asaas** (Pix, boleto e cartão). **Preço inicial R$ 39/mês**, configurável por `PLAN_PRICE_CENTS` (centavos; padrão 3900). Nunca fixar o preço no código.
6. **UI e conteúdo em pt-BR.** Moeda BRL.
7. **Sem dados pessoais de terceiros.** Só dados de produto/loja públicos via API oficial.

## REGRA: nenhum serviço que possa gerar custo até o lançamento

**Não conectar** Supabase, Neon, Vercel, Asaas, Stripe nem qualquer serviço pago/com risco de cobrança antes do lançamento. Tudo roda local e de graça. (GitHub é gratuito e pode ser usado.)

- Todo serviço externo fica atrás de uma **interface**, com troca mock/real por variável de ambiente, igual ao `DATA_SOURCE`:

  | Interface | Local (padrão) | Real | Variável |
  |---|---|---|---|
  | `ProductSource` | mock | Shopee | `DATA_SOURCE` |
  | `Db` (Drizzle) | PGlite (`.data/pglite`) | PostgreSQL | `DB_DRIVER` |
  | `AuthProvider` | login simulado só com e-mail | Supabase Auth | `AUTH_PROVIDER` |
  | `BillingProvider` | Asaas simulado (checkout local) | Asaas | `BILLING_PROVIDER` |
  | `AffiliateLinkProvider` | link falso `.invalid` | Affiliate API da Shopee (stub) | `LINK_PROVIDER` |
  | Job diário | `npm run job:daily` | cron chama `/api/cron/snapshot` | `CRON_SECRET` |

- **Trava no código:** `loadEnv` (`src/lib/env.ts`) recusa subir com auth/cobrança/banco reais se `ALLOW_PAID_SERVICES` não for `true`. Não contornar; não commitar `ALLOW_PAID_SERVICES=true`.
- Código novo que dependa de serviço externo **precisa** de interface + implementação local + teste sem rede. Nunca importar SDK/cliente de serviço fora do seu adapter.
- O que conectar, em que ordem e como testar: **`LANCAMENTO.md`**. Ao criar integração nova, atualizar esse arquivo no mesmo commit.
- Adapters reais escritos antes do acesso (Asaas) foram testados só com `fetch` falso e estão marcados como não validados no `LANCAMENTO.md`.

## Stack

- **Next.js 16 (App Router) + TypeScript estrito**, um único app, sem monorepo. **Tailwind CSS v4**.
- **Drizzle ORM** com schema Postgres (`src/db/schema.ts`). Local: **PGlite** (Postgres em WASM, sem servidor); migrações em `drizzle/` (geradas com `npm run db:generate`, aplicadas sozinhas no PGlite).
- **Auth:** interface `AuthProvider`; local = `DevAuthProvider` (cookie httpOnly assinado com HMAC); real planejado = Supabase Auth.
- **Cobrança:** interface `BillingProvider`; local = mock com `/checkout/simulado/[id]`, que dispara webhooks no formato do Asaas pelo **mesmo caminho** do real (`BillingService.handleWebhook`, idempotente por id de evento). Real = `AsaasBillingProvider`.
- **Job diário:** `SnapshotJob` grava 1 snapshot/produto/dia (idempotente). Local: `npm run job:daily [-- --watch]`. Produção: `/api/cron/snapshot` com `Authorization: Bearer $CRON_SECRET`.
- **Testes:** Vitest (domínio, dados, billing, limites, job; PGlite em memória) e Playwright (`npm run test:e2e`, precisa de `npm run build` antes).
- Zod nas fronteiras (adapters, env, webhooks).

## Estrutura de pastas

```
├── CLAUDE.md · LANCAMENTO.md · docs/score.md · .env.example
├── drizzle/                     # migrações SQL
├── scripts/job-daily.ts         # job diário local
├── tests/e2e/                   # Playwright
└── src/
    ├── app/                     # rotas Next (/, /precos, /login, /radar, /produto/[id], /conta,
    │                            #   /checkout/simulado/[id], /api/webhooks/asaas, /api/cron/snapshot)
    ├── domain/                  # puro, sem I/O: tipos e scoring/
    ├── data/                    # ProductSource: mock/ e shopee/ (stub)
    ├── db/                      # schema Drizzle e createDb (PGlite | postgres)
    ├── auth/                    # AuthProvider: dev-auth, supabase-auth (stub)
    ├── billing/                 # BillingProvider: mock-billing, asaas-billing; BillingService
    ├── entitlements/            # limites do plano grátis x pro
    ├── generator/               # GeneratorService, links (mock/shopee), pin-image (SVG→PNG)
    ├── jobs/                    # SnapshotJob, dailySalesFromSnapshots
    ├── services/                # RadarService (radar e ficha)
    ├── components/ · lib/       # UI; env, container (monta tudo), session, format
```

Regra de dependência: `app → services/billing/entitlements/jobs → (data, domain, db)`. `domain` não importa de ninguém. `lib/container.ts` é o único lugar que escolhe mock/real.

## Estado da implementação

Pronto e testado (`npm test`: 74 testes; `npm run test:e2e`: 4 fluxos): radar com filtro por categoria e ordenação (score / mais vendidos / em alta), ficha do produto com score e detalhamento, plano grátis (top 10, 5 fichas/dia, detalhamento bloqueado) x Pro (tudo liberado), login simulado, assinatura simulada (Pix/boleto/cartão), webhooks idempotentes, job diário, **gerador de pins** (ver abaixo).
Não feito: alertas, publicação automática no Pinterest, integrações reais, coleta de CPF/CNPJ para o Asaas, páginas legais.

Comandos: `npm run dev` · `npm run build && npm start` · `npm test` · `npm run typecheck` · `npm run test:e2e` · `npm run job:daily` · `npm run db:generate`.
Detalhes da camada de dados e do score continuam nas seções abaixo e em `docs/score.md`. O score é **sempre calculado contra o nicho inteiro** e só depois filtrado por categoria.

## Gerador de pins (funcionalidade 5)

Da ficha do produto: **link de afiliado + legenda + imagem 1000×1500 (2:3)** para o Pinterest. Publicação é **manual** (baixar, copiar). Sem publicação automática.

- **Limite:** plano grátis `FREE_PINS_PER_DAY` (padrão **1**) produtos distintos por dia; trocar o tom do mesmo produto no mesmo dia **não** gasta outro. Pro ilimitado. Checagem protegida por `pg_advisory_xact_lock` por usuário.
- **Link:** interface `AffiliateLinkProvider`. Mock gera `https://afiliado-demo.invalid/...` (TLD reservado, nunca resolve) com `subIds` `[pinterest, categoria, id-do-pin]` para saber qual pin vendeu. O link do dia é reaproveitado ao trocar o tom.
- **Legenda:** só **templates** (`src/domain/generator/caption.ts`, 3 tons), determinística, sem custo. Título ≤ 100 e descrição ≤ 500 caracteres. **Regras de conteúdo (testadas):** sempre inclui o aviso de afiliado e `#publi`; só afirma nota/avaliações/vendas quando os dados sustentam (nota ≥ 4,5 com ≥ 10 avaliações; vendas ≥ 50, arredondadas **para baixo**); nunca promete "frete grátis", "melhor do Brasil" etc.; **a comissão nunca aparece** na legenda nem na imagem. Um gerador por LLM seria outra implementação de `CaptionGenerator` (pago: só no `LANCAMENTO.md`).
- **Imagem:** SVG → PNG com `@resvg/resvg-js` e fonte DejaVu embutida em `assets/fonts` (não depende de fontes do sistema). Rota `/api/pin/[id]` regenera o PNG a partir da linha salva em `generated_pins` (snapshot do produto no momento da geração), **só para o dono**. Sem serviço de armazenamento. Hoje desenha uma ilustração ("imagem ilustrativa"); com dados reais entra a foto do produto.

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
2. Limites finais do plano grátis (hoje 10 / 5 por dia, configuráveis).
3. Calibração dos pesos do score com dados reais. No mock (60 produtos) a distribuição é Boa 20 · Mediana 32 · Evitar 8, máximo 78: nenhum "Excelente" ainda, porque o score usa percentis do nicho e exige topo em quase tudo ao mesmo tempo.
