import Link from "next/link";
import { Shell } from "@/components/ui";
import { getContainer } from "@/lib/container";
import { formatBRL } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Precos() {
  const [c, user] = await Promise.all([getContainer(), getCurrentUser()]);
  const plan = user ? await c.billing.planFor(user.id) : undefined;
  const { FREE_RADAR_LIMIT, FREE_SHEETS_PER_DAY, PLAN_PRICE_CENTS } = c.env;
  return (
    <Shell user={user} plan={plan}>
      <h1 className="text-center text-3xl font-bold">Planos</h1>
      <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Grátis</h2>
          <p className="mt-1 text-3xl font-bold">R$ 0</p>
          <ul className="mt-4 space-y-2 text-sm text-stone-700">
            <li>✓ Top {FREE_RADAR_LIMIT} do radar</li>
            <li>✓ {FREE_SHEETS_PER_DAY} fichas de produto por dia</li>
            <li>✓ Score de oportunidade</li>
            <li className="text-stone-400">✗ Detalhamento do score</li>
            <li className="text-stone-400">✗ Radar completo e filtros</li>
          </ul>
        </div>
        <div className="rounded-xl border-2 border-brand bg-white p-6">
          <h2 className="text-lg font-semibold text-brand">Pro</h2>
          <p className="mt-1 text-3xl font-bold">{formatBRL(PLAN_PRICE_CENTS)}<span className="text-base font-normal text-stone-500">/mês</span></p>
          <ul className="mt-4 space-y-2 text-sm text-stone-700">
            <li>✓ Radar completo, todas as categorias</li>
            <li>✓ Fichas ilimitadas</li>
            <li>✓ Detalhamento do score</li>
            <li>✓ Pix, boleto ou cartão</li>
          </ul>
          <Link href={user ? "/conta" : "/login"} className="mt-6 block rounded-lg bg-brand py-2 text-center font-semibold text-white hover:bg-brand-dark">
            Assinar
          </Link>
        </div>
      </div>
    </Shell>
  );
}
