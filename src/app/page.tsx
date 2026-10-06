import Link from "next/link";
import { Shell } from "@/components/ui";
import { getContainer } from "@/lib/container";
import { formatBRL } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [c, user] = await Promise.all([getContainer(), getCurrentUser()]);
  const plan = user ? await c.billing.planFor(user.id) : undefined;
  return (
    <Shell user={user} plan={plan}>
      <section className="py-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Pare de divulgar produto que não vende.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
          O Radar mostra, para produtos de casa na Shopee, quanto você ganha de comissão, quanto vende e se o vendedor é confiável, tudo
          resumido num score de 0 a 100.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href={user ? "/radar" : "/login"} className="rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
            {user ? "Abrir o radar" : "Começar grátis"}
          </Link>
          <Link href="/precos" className="rounded-lg border border-stone-300 bg-white px-5 py-3 font-semibold hover:bg-stone-100">
            Ver planos ({formatBRL(c.env.PLAN_PRICE_CENTS)}/mês)
          </Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Radar", "Os mais vendidos e os que estão em alta, por categoria: organização, cozinha, limpeza, banheiro e decoração."],
          ["Ficha do produto", "Preço, % de comissão, comissão em R$, volume de vendas, nota da loja e avaliações."],
          ["Score de oportunidade", "Demanda, comissão, tendência e confiabilidade do vendedor num número só."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">{t}</h2>
            <p className="mt-2 text-sm text-stone-600">{d}</p>
          </div>
        ))}
      </section>
    </Shell>
  );
}
