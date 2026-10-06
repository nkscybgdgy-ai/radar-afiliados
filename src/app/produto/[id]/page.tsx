import Link from "next/link";
import { notFound } from "next/navigation";
import { Locked, ScoreBadge, Shell, Sparkline } from "@/components/ui";
import { CATEGORY_LABELS } from "@/domain/types";
import { getContainer } from "@/lib/container";
import { formatBRL, formatInt, formatPct } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const BADGE = { official: "Loja oficial", preferred: "Loja preferida", regular: "Loja comum" } as const;
const WEIGHTS = { demand: ["Demanda", 30], commission: ["Comissão", 25], trend: ["Tendência", 25], reliability: ["Confiabilidade", 20] } as const;

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const c = await getContainer();
  const plan = await c.billing.planFor(user.id);
  const sheet = await c.radar.getProductSheet(id);
  if (!sheet) notFound();

  const access = await c.entitlements.consumeSheet(user.id, plan, id);
  if (!access.allowed) {
    return (
      <Shell user={user} plan={plan}>
        <div className="mx-auto max-w-md rounded-xl border border-stone-200 bg-white p-6 text-center">
          <h1 className="text-lg font-bold">Limite diário de fichas atingido</h1>
          <p className="mt-2 text-sm text-stone-600">O plano grátis inclui {access.limit} fichas por dia. Volte amanhã ou assine o Pro.</p>
          <Link href="/precos" className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 font-semibold text-white">Ver planos</Link>
        </div>
      </Shell>
    );
  }

  const history = await c.source.getSalesHistory(id, 30);
  const { product: p, score: s, shop } = sheet;
  const showBreakdown = c.entitlements.canSeeBreakdown(plan);

  return (
    <Shell user={user} plan={plan}>
      <Link href="/radar" className="text-sm text-stone-500 hover:text-brand">← Radar</Link>
      <div className="mt-3 grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <div className="text-xs text-stone-500">{CATEGORY_LABELS[p.category]}</div>
          <h1 className="mt-1 text-2xl font-bold">{p.name}</h1>
          {s.labels.map((l) => <span key={l} className="mt-2 mr-2 inline-block rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-800">{l}</span>)}
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            {[
              ["Preço", formatBRL(p.priceCents)],
              ["% de comissão", formatPct(p.commissionRate)],
              ["Comissão por venda", formatBRL(sheet.commissionCents)],
              ["Vendas (30 dias)", formatInt(sheet.sales30d)],
              ["Vendas (total)", formatInt(p.salesTotal)],
              ["Avaliações", `${p.ratingStar.toFixed(1)} ★ (${formatInt(p.ratingCount)})`],
            ].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-stone-500">{k}</dt><dd className="mt-0.5 text-lg font-semibold tabular-nums">{v}</dd></div>
            ))}
          </dl>
          <div className="mt-6">
            <div className="text-xs text-stone-500">Vendas por dia, últimos 30 dias</div>
            <Sparkline values={history.map((h) => h.sales)} />
          </div>
          {shop && (
            <div className="mt-4 rounded-lg bg-stone-50 p-3 text-sm">
              <span className="font-medium">{shop.name}</span> · nota da loja {shop.rating.toFixed(1)} ★ · {BADGE[shop.badge]}
            </div>
          )}
          <Link href={`/gerador/${p.id}`} className="mt-5 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Gerar pin para o Pinterest</Link>
          {p.source === "mock" && <p className="mt-3 text-xs text-amber-700">Dados de demonstração.</p>}
        </div>

        <aside className="rounded-xl border border-stone-200 bg-white p-6">
          <div className="text-xs text-stone-500">Score de oportunidade</div>
          <div className="mt-2"><ScoreBadge score={s.score} band={s.band} /></div>
          {s.caps.length > 0 && <p className="mt-2 text-xs text-red-700">Limitado por: {s.caps.join(", ")}</p>}
          <div className="mt-5 space-y-3">
            {(Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map((k) => (
              <div key={k}>
                <div className="flex justify-between text-xs"><span>{WEIGHTS[k][0]} <span className="text-stone-400">({WEIGHTS[k][1]}%)</span></span>
                  {showBreakdown ? <span className="tabular-nums">{s.breakdown[k]}</span> : <Locked>Pro</Locked>}</div>
                <div className="mt-1 h-1.5 rounded bg-stone-100">{showBreakdown && <div className="h-1.5 rounded bg-brand" style={{ width: `${s.breakdown[k]}%` }} />}</div>
              </div>
            ))}
          </div>
          {!showBreakdown && <Link href="/precos" className="mt-4 block text-sm font-medium text-brand hover:underline">Liberar detalhamento (Pro)</Link>}
          {access.limit && <p className="mt-4 text-xs text-stone-500">Fichas hoje: {access.used}/{access.limit}</p>}
        </aside>
      </div>
    </Shell>
  );
}
