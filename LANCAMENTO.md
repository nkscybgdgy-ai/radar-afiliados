# Checklist de lançamento: o que conectar depois

**Regra:** até o lançamento, nenhum serviço que possa gerar custo é conectado. Hoje tudo roda local:

| Peça | Hoje (local, grátis) | No lançamento (real) |
|---|---|---|
| Dados de produto | mock determinístico (`DATA_SOURCE=mock`) | API de afiliados da Shopee (`shopee`) |
| Banco | PGlite em `.data/pglite` (`DB_DRIVER=pglite`) | PostgreSQL (`postgres`) |
| Autenticação | login simulado só com e-mail (`AUTH_PROVIDER=dev`) | Supabase Auth (`supabase`) |
| Cobrança | Asaas simulado (`BILLING_PROVIDER=mock`) | Asaas (`asaas`) |
| Link de afiliado | link falso `.invalid` (`LINK_PROVIDER=mock`) | Affiliate API da Shopee (`shopee`) |
| Job diário | `npm run job:daily` | cron da hospedagem chamando `/api/cron/snapshot` |
| Hospedagem | `npm run dev` / `npm start` | Vercel (ou equivalente) |

**Trava de segurança:** com `AUTH_PROVIDER`, `BILLING_PROVIDER` ou `DB_DRIVER` diferentes do local, o app **recusa subir** (`src/lib/env.ts`) a menos que `ALLOW_PAID_SERVICES=true`. Só defina isso no dia de conectar.

> **Ordem recomendada:** 1 Shopee → 2 Postgres → 3 Hospedagem (ainda com auth/cobrança simulados, só para ver no ar) → 4 Auth → 5 Asaas **sandbox** → 6 Asaas produção. Teste cada etapa antes de seguir. Troque uma variável por vez.

Cada serviço abaixo traz: conta, variáveis, o que ainda falta no código e como testar.

---

## 1. API da Shopee (dados reais)

**Custo:** o programa de afiliados é gratuito, mas a regra vale: só conecte quando o acesso à API for liberado.

- **Conta:** programa de afiliados da Shopee Brasil, com acesso à Affiliate Open API (credenciais de API).
- **Variáveis:** `DATA_SOURCE=shopee` + as credenciais que a Shopee fornecer (os nomes serão definidos ao implementar o adapter, por exemplo `SHOPEE_APP_ID` e `SHOPEE_SECRET`; adicioná-los em `src/lib/env.ts`).
- **Falta no código:** `src/data/shopee/shopee-source.ts` é um stub que lança erro. Implementar `ProductSource` mapeando a resposta oficial para `RawProduct`/`RawShop` (validar com `RawProductSchema`). Confirmar quais campos a API realmente entrega (nota da loja, nº de avaliações, selo da loja, vendas). **Scraping é proibido.**
- **Histórico de vendas:** a API entrega só o acumulado. `getSalesHistory` do adapter real deve usar `dailySalesFromSnapshots` (`src/jobs/daily-snapshot.ts`), alimentado pelo job diário. A tendência só fica confiável depois de algumas semanas de snapshots: **ligue o job o quanto antes**, mesmo antes do lançamento.
- **Como testar:**
  1. `DATA_SOURCE=shopee npm run job:daily`: deve gravar snapshots de produtos reais.
  2. `npm test`: os testes de contrato de `ProductSource` devem passar também contra o adapter real (rodar `mock-source.test.ts` adaptado).
  3. Abrir `/radar`: o banner "dados de demonstração" some sozinho quando `DATA_SOURCE` não é `mock`.

## 2. Banco PostgreSQL (Neon ou Supabase)

- **Conta:** Neon (neon.tech) ou Supabase. Criar um projeto/banco **de produção** e, se possível, outro de teste.
- **Variáveis:**
  - `DB_DRIVER=postgres`
  - `DATABASE_URL=postgres://usuario:senha@host/db?sslmode=require`
  - `ALLOW_PAID_SERVICES=true`
- **Migrações:** o PGlite migra sozinho; o Postgres real **não**. Rodar `DATABASE_URL=... npm run db:migrate` (usa `./drizzle`). Mudou o schema? `npm run db:generate`, commitar a migração, migrar de novo.
- **Atenção:** o PGlite grava em disco local e **não serve em hospedagem serverless** (disco efêmero). Em produção `DB_DRIVER=postgres` é obrigatório.
- **Como testar:**
  1. `npm run db:migrate` termina sem erro; as tabelas aparecem no painel.
  2. `DB_DRIVER=postgres DATABASE_URL=... ALLOW_PAID_SERVICES=true npm run job:daily` grava 60 snapshots (mock) ou os reais.
  3. Subir o app, entrar, abrir uma ficha e conferir a linha em `sheet_views`.
- **Não testado:** o caminho `node-postgres` em `src/db/index.ts` nunca foi executado contra um servidor real (só PGlite). É um dos itens a validar aqui.

## 3. Autenticação (Supabase Auth)

- **Conta:** Supabase (pode ser a mesma do banco).
- **Variáveis:** `AUTH_PROVIDER=supabase`, `ALLOW_PAID_SERVICES=true` e as chaves do projeto (`SUPABASE_URL`, `SUPABASE_ANON_KEY`; adicionar em `src/lib/env.ts` ao implementar).
- **Falta no código:** `src/auth/supabase-auth.ts` é um stub. Implementar `AuthProvider`: login por link mágico/Google, `verifySession` validando o JWT. O id do usuário em `users.id` deve ser o `uid` do Supabase. Remover/esconder o aviso de login simulado (`src/app/login/page.tsx`, já só aparece com `auth.kind === "dev"`).
- **Como testar:** criar usuário real, entrar, confirmar que `/radar` exige login, que um token adulterado é rejeitado e que o logout invalida a sessão. `AUTH_PROVIDER=dev` precisa estar **impossível** em produção: conferir que a variável está `supabase` no painel da hospedagem.

## 4. Asaas: cobrança (Pix, boleto, cartão)

- **Conta:** criar conta no Asaas e usar primeiro o **sandbox** (sandbox.asaas.com). Só depois a conta de produção, que exige validação cadastral.
- **Variáveis:**
  - `BILLING_PROVIDER=asaas`, `ALLOW_PAID_SERVICES=true`
  - `ASAAS_API_KEY`: chave de API (sandbox primeiro)
  - `ASAAS_BASE_URL`: sandbox `https://sandbox.asaas.com/api/v3` · produção `https://api.asaas.com/v3`
  - `ASAAS_WEBHOOK_TOKEN`: segredo longo gerado por você (32+ caracteres aleatórios)
  - `PLAN_PRICE_CENTS`: preço em centavos (padrão `3900` = R$ 39,00)
- **Webhook:** no painel do Asaas, cadastrar `https://SEU-DOMINIO/api/webhooks/asaas` com o token acima (o Asaas o envia no header `asaas-access-token`) e os eventos `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_DELETED`, `SUBSCRIPTION_INACTIVATED`.
- **Falta / validar:** `src/billing/asaas-billing.ts` está escrito mas foi testado **só com fetch falso**, nunca contra o sandbox. Confirmar na documentação e no sandbox: nomes dos eventos, formato do payload, endpoints e campos. O Asaas costuma exigir **CPF/CNPJ** do cliente para gerar cobrança: o adapter aceita `cpfCnpj`, mas a tela `/conta` ainda não coleta (adicionar o campo e validar). Definir também política de inadimplência (hoje: `overdue` volta para o plano grátis).
- **Como testar (sandbox):**
  1. Assinar pelo `/conta` com Pix: deve redirecionar para a fatura do Asaas (`invoiceUrl`).
  2. No painel do sandbox, marcar a cobrança como paga: o webhook deve chegar, `subscriptions.status` virar `active` e a conta mostrar "Plano: Pro".
  3. Reenviar o mesmo webhook: resposta `duplicate`, nada muda (idempotência).
  4. Webhook com token errado: HTTP 401.
  5. Repetir com boleto e cartão (cartões de teste do Asaas).
  6. Cancelar a assinatura pelo app e conferir no painel.
  7. Só então produção, com uma assinatura real de valor baixo feita por você.

## 5. Hospedagem (Vercel) e job diário

- **Conta:** Vercel (ou outra com Node e cron).
- **Variáveis** (no painel): todas as das seções anteriores, mais `CRON_SECRET` (segredo longo; a Vercel o envia como `Authorization: Bearer ...` nas chamadas de cron) e `AUTH_SECRET` caso mantenha algum fluxo assinado local.
- **Cron diário:** criar `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/cron/snapshot", "schedule": "0 6 * * *" }] }
  ```
  (06:00 UTC = 03:00 em Brasília.)
- **Como testar:**
  - `curl -i https://SEU-DOMINIO/api/cron/snapshot`: **401**.
  - `curl -i -H "Authorization: Bearer $CRON_SECRET" https://SEU-DOMINIO/api/cron/snapshot`: **200** com `{"day":"...","products":N}`.
  - Conferir uma linha nova em `job_runs` por dia e `product_snapshots` crescendo.
  - Se o job falhar, `job_runs.status = 'error'` guarda o motivo; configurar um alerta (e-mail/Slack) para isso.

## 6. Gerador de pins: link de afiliado, foto e Pinterest

- **Link real (Shopee):** `LINK_PROVIDER=shopee` + as credenciais da seção 1. Implementar `ShopeeAffiliateLinkProvider` (`src/generator/links.ts`, hoje um stub) com a mutation de link curto da Affiliate API, enviando os `subIds` (`pinterest`, categoria, id do pin). **Confirmar** quantos subIds a API aceita e quais caracteres permite (o mock usa letras minúsculas, números e `_`).
- **Teste do link:** gerar um pin, abrir o link copiado em janela anônima (deve levar ao produto) e conferir no painel de afiliados da Shopee que o clique aparece com o `subId` do pin.
- **Foto do produto:** `RawProduct.imageUrl` hoje é `mock:<id>`. Com a API real, baixar a foto (URL da API), embutir no SVG (`src/generator/pin-image.ts`, no lugar da ilustração) e **remover o texto "imagem ilustrativa"**. Confirmar que a API entrega uma URL de imagem utilizável e que o uso da foto em pins é permitido pelos termos do programa.
- **Hospedagem:** o PNG lê a fonte do disco. `next.config.ts` já inclui `assets/fonts` no pacote (`outputFileTracingIncludes`) e marca `@resvg/resvg-js` como externo. **Testar no deploy real** (`curl` autenticado em `/api/pin/<id>` deve devolver `image/png`): se a plataforma não empacotar o binário nativo, a imagem quebra só lá.
- **Pinterest (validar com conta real):** (a) o Pinterest aceita o link curto da Shopee como destino do pin? Se rejeitar ou penalizar, avaliar link direto com parâmetros de afiliado; (b) limites de título/descrição (o app usa 100/500, de memória); (c) aviso de afiliado: o app inclui o texto e `#publi` em toda legenda; revisar com as regras do Pinterest e do CONAR.
- **Publicação automática:** fora do escopo. Se um dia for feita, será uma interface `PinterestPublisher` (API do Pinterest exige app aprovado).
- **Legenda por LLM (opcional, pago):** implementar `CaptionGenerator` com a API do Claude atrás de uma variável própria, com limite de custo por usuário. Não fazer antes do lançamento.
- **Limite grátis:** `FREE_PINS_PER_DAY` (padrão 1).

## 7. Antes de abrir ao público

- [ ] `AUTH_PROVIDER=supabase`, `BILLING_PROVIDER=asaas`, `DB_DRIVER=postgres`, `DATA_SOURCE=shopee`, `LINK_PROVIDER=shopee` na produção (nenhum mock).
- [ ] `/checkout/simulado/...` responde 404 (só existe com `BILLING_PROVIDER=mock`).
- [ ] Nenhum segredo de dev em produção: trocar `AUTH_SECRET`, `CRON_SECRET`, `ASAAS_WEBHOOK_TOKEN`.
- [ ] Termos de uso, política de privacidade e aviso de afiliado/comissão nas páginas públicas.
- [ ] `LINK_PROVIDER=shopee`: links reais funcionando; texto "imagem ilustrativa" removido do pin.
- [ ] Limites do plano grátis revisados (`FREE_RADAR_LIMIT`, `FREE_SHEETS_PER_DAY`, `FREE_PINS_PER_DAY`) e preço final (`PLAN_PRICE_CENTS`).
- [ ] Calibração dos pesos do score com dados reais (`src/domain/scoring/config.ts` e `docs/score.md`).
- [ ] Teste ponta a ponta com dinheiro real: assinar, ser cobrado, cancelar.
