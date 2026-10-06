import Link from "next/link";
import { Locked, ScoreBadge, Shell } from "@/components/ui";
import { HOME_CATEGORIES, CATEGORY_LABELS, type HomeCategory } from "@/domain/types";
import type { RadarSort } from "@/services/radar.service";
import { getContainer } from "@/lib/container";
import { formatBRL, formatInt, formatPct } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const SORTS: { key: RadarSort; label: string }[] = [
  { key: "score", label: "Score" },
  { key: "sales", label: "Mais vendidos" },
  { key: "trend", label: "Em alta" },
];

export default async function RadarPage({ searchParams }: { searchParams: Promise<{ categoria?: string; ordem?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const c = await getContainer();
  const plan = await c.billing.planFor(user.id);
  const category = HOME_CATEGORIES.find((x) => x === sp.categoria) as HomeCategory | undefined;
  const sortBy = SORTS.find((s) => s.key === sp.ordem)?.key ?? "score";
  const all = await c.radar.getRadar({ category, sortBy });
  const limit = c.entitlements.radarLimit(plan);
  const items = limit ? all.slice(0, limit) : all;
  const href = (cat?: string, ord?: string) => `/radar?${new URLSearchParams({ ...(cat ? { categoria: cat } : {}), ...(ord ? { ordem: ord } : {}) })}`;

  return (
    <Shell user={user} plan={plan}>
      <h1 className="text-2xl font-bold">Radar: produtos para casa</h1>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href={href(undefined, sortBy)} className={`rounded-full px-3 py-1 ring-1 ring-stone-300 ${!category ? "bg-ink text-white" : "bg-white"}`}>Todas</Link>
        {HOME_CATEGORIES.map((k) => (
          <Link key={k} href={href(k, sortBy)} className={`rounded-full px-3 py-1 ring-1 ring-stone-300 ${category === k ? "bg-ink text-white" : "bg-white"}`}>{CATEGORY_LABELS[k]}</Link>
        ))}
      </div>
      <div className="mt-3 flex gap-3 text-sm text-stone-600">
        Ordenar por:
        {SORTS.map((s) => (
          <Link key={s.key} href={href(category, s.key)} className={sortBy === s.key ? "font-semibold text-brand" : "hover:text-brand"}>{s.label}</Link>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100 text-xs uppercase text-stone-500">
            <tr><th className="p-3">Produto</th><th className="p-3">Preço</th><th className="p-3">Comissão</th><th className="p-3">Vendas 30d</th><th className="p-3">Score</th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.product.id} className="border-t border-stone-100 hover:bg-stone-50">
                <td className="p-3">
                  <Link href={`/produto/${i.product.id}`} className="font-medium hover:text-brand">{i.product.name}</Link>
                  <div className="text-xs text-stone-500">
                    {CATEGORY_LABELS[i.product.category]}
                    {i.score.labels.map((l) => <span key={l} className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-sky-800">{l}</span>)}
                    {i.score.growth >= 1.3 && <span className="ml-2 rounded bg-orange-100 px-1.5 py-0.5 text-orange-800">em alta</span>}
                  </div>
                </td>
                <td className="p-3 tabular-nums">{formatBRL(i.product.priceCents)}</td>
                <td className="p-3 tabular-nums">{formatBRL(i.commissionCents)} <span className="text-stone-500">({formatPct(i.product.commissionRate)})</span></td>
                <td className="p-3 tabular-nums">{formatInt(i.sales30d)}</td>
                <td className="p-3"><ScoreBadge score={i.score.score} band={i.score.band} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {limit && all.length > limit && (
        <p className="mt-4 text-sm text-stone-600">
          <Locked>Plano grátis mostra o top {limit} de {all.length}.</Locked>{" "}
          <Link href="/precos" className="font-medium text-brand hover:underline">Ver radar completo</Link>
        </p>
      )}
    </Shell>
  );
}
