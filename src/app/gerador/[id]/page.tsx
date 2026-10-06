import Link from "next/link";
import { notFound } from "next/navigation";
import { generatePinAction } from "@/app/actions";
import { CopyButton } from "@/components/copy-button";
import { Shell } from "@/components/ui";
import { TONES, TONE_LABELS } from "@/domain/generator/caption";
import { getContainer } from "@/lib/container";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function GeradorProduto({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ limite?: string }> }) {
  const [{ id }, { limite }] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const c = await getContainer();
  const product = await c.source.getProduct(id);
  if (!product) notFound();
  const [plan, pin, used] = await Promise.all([c.billing.planFor(user.id), c.generator.todayPin(user.id, id), c.generator.usedToday(user.id)]);
  const limit = plan === "pro" ? null : c.env.FREE_PINS_PER_DAY;
  const blocked = !pin && limit !== null && used >= limit;
  const hashtags = pin ? (pin.hashtags as string[]) : [];

  return (
    <Shell user={user} plan={plan}>
      <Link href={`/produto/${id}`} className="text-sm text-stone-500 hover:text-brand">← Ficha do produto</Link>
      <h1 className="mt-2 text-2xl font-bold">Gerar pin: {product.name}</h1>
      <p className="mt-1 text-sm text-stone-600">
        {limit === null ? "Plano Pro: pins ilimitados." : `Plano grátis: ${used}/${limit} pin por dia.`}{" "}
        {limite && <span className="text-red-700">Limite diário atingido.</span>}
      </p>

      {blocked ? (
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
          <p className="font-medium">Você já usou o pin de hoje.</p>
          <p className="mt-1 text-sm text-stone-600">Volte amanhã ou assine o Pro para gerar sem limite.</p>
          <Link href="/precos" className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 font-semibold text-white">Ver planos</Link>
        </div>
      ) : (
        <form action={generatePinAction} className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-4">
          <input type="hidden" name="productId" value={id} />
          <label className="text-sm">Tom da legenda:{" "}
            <select name="tone" defaultValue={pin?.tone ?? "direto"} className="rounded border border-stone-300 px-2 py-1">
              {TONES.map((t) => <option key={t} value={t}>{TONE_LABELS[t]}</option>)}
            </select>
          </label>
          <button className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark">{pin ? "Gerar de novo" : "Gerar pin"}</button>
          {pin && limit !== null && <span className="text-xs text-stone-500">Trocar o tom do mesmo produto não gasta outro pin.</span>}
        </form>
      )}

      {pin && (
        <div className="mt-6 grid gap-6 md:grid-cols-[300px_1fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/pin/${pin.id}`} alt={`Pin: ${pin.productName}`} width={300} height={450} className="w-full rounded-xl border border-stone-200 shadow-sm" />
            <a href={`/api/pin/${pin.id}?download=1`} className="mt-3 block rounded-lg bg-ink py-2 text-center text-sm font-semibold text-white hover:opacity-90">Baixar imagem (PNG)</a>
            <p className="mt-2 text-xs text-stone-500">1000×1500, proporção 2:3 do Pinterest. Imagem ilustrativa enquanto os dados são de demonstração.</p>
          </div>
          <div className="space-y-5 rounded-xl border border-stone-200 bg-white p-5 text-sm">
            <section>
              <div className="flex items-center justify-between"><h2 className="font-semibold">Título</h2><CopyButton text={pin.title} label="Copiar" /></div>
              <p className="mt-1 whitespace-pre-wrap">{pin.title}</p>
            </section>
            <section>
              <div className="flex items-center justify-between"><h2 className="font-semibold">Descrição</h2><CopyButton text={pin.description} label="Copiar" /></div>
              <p className="mt-1 whitespace-pre-wrap">{pin.description}</p>
              <p className="mt-1 text-xs text-stone-500">{pin.description.length}/500 caracteres · {hashtags.length} hashtags</p>
            </section>
            <section>
              <div className="flex items-center justify-between"><h2 className="font-semibold">Link de afiliado (destino do pin)</h2><CopyButton text={pin.affiliateUrl} label="Copiar" /></div>
              <p className="mt-1 break-all font-mono text-xs">{pin.affiliateUrl}</p>
              {c.env.LINK_PROVIDER === "mock" && <p className="mt-1 text-xs text-amber-700">Link de demonstração: não funciona de verdade.</p>}
            </section>
            <p className="text-xs text-stone-500">Publicação no Pinterest é manual: baixe a imagem, cole título, descrição e o link.</p>
          </div>
        </div>
      )}
    </Shell>
  );
}
