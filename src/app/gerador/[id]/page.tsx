import Link from "next/link";
import { notFound } from "next/navigation";
import { generatePinAction } from "@/app/actions";
import { CopyButton } from "@/components/copy-button";
import { Shell, Sparkline } from "@/components/ui";
import { claimsFor, TONES, TONE_LABELS } from "@/domain/generator/caption";
import { isPinStyle, STYLE_IDS, STYLE_LABELS, styleAvailable, type PinStyle } from "@/generator/pin-design";
import { getContainer } from "@/lib/container";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const STYLE_HINT: Record<PinStyle, string> = {
  minimalista: "Fundo claro, foto grande, tipografia limpa",
  vibrante: "Foto até a borda e cor forte da categoria",
  achadinho: "Fita e estrela de preço, o mais chamativo",
  emalta: "Prova social de vendas, fundo escuro",
  emaltaclaro: "Prova social de vendas, fundo claro",
};

export default async function GeradorProduto({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ limite?: string; estilo?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const c = await getContainer();
  const sheet = await c.radar.getProductSheet(id);
  if (!sheet) notFound();
  const product = sheet.product;
  const [plan, pin, used, history] = await Promise.all([c.billing.planFor(user.id), c.generator.todayPin(user.id, id), c.generator.usedToday(user.id), c.source.getSalesHistory(id, 30)]);
  const limit = plan === "pro" ? null : c.env.FREE_PINS_PER_DAY;
  const blocked = !pin && limit !== null && used >= limit;
  const hashtags = pin ? (pin.hashtags as string[]) : [];
  const claims = claimsFor({ rating: product.ratingStar, ratingCount: product.ratingCount, sales30d: sheet.sales30d, sales7d: sheet.sales7d });
  const currentStyle: PinStyle = pin && isPinStyle(pin.style) ? pin.style : "minimalista";

  return (
    <Shell user={user} plan={plan}>
      <Link href={`/produto/${id}`} className="text-sm text-stone-500 hover:text-brand">← Ficha do produto</Link>
      <h1 className="mt-2 text-2xl font-bold">Gerar pin: {product.name}</h1>
      <p className="mt-1 text-sm text-stone-600">
        {limit === null ? "Plano Pro: pins ilimitados." : `Plano grátis: ${used}/${limit} pin por dia.`}{" "}
        {sp.limite && <span className="text-red-700">Limite diário atingido.</span>}{" "}
        {sp.estilo && <span className="text-red-700">Esse estilo não está disponível para este produto.</span>}
      </p>

      {/* Só para quem divulga: não aparece na imagem do pin (que é para o comprador). */}
      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4 text-sm">
        <div className="font-semibold">Tendência de vendas <span className="font-normal text-stone-500">(só aqui, não aparece no pin)</span></div>
        {claims.trendPct !== undefined ? (
          <p className="mt-1">Ritmo da última semana <b>+{claims.trendPct}%</b> acima da média dos últimos 30 dias. Os estilos “Em alta” estão liberados.</p>
        ) : (
          <p className="mt-1 text-stone-600">Este produto não está em alta (ritmo semanal menos de 30% acima da média, ou volume baixo). Os estilos “Em alta” ficam indisponíveis.</p>
        )}
        <div className="mt-2 max-w-md"><Sparkline values={history.map((h) => h.sales)} /></div>
      </div>

      {blocked ? (
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
          <p className="font-medium">Você já usou o pin de hoje.</p>
          <p className="mt-1 text-sm text-stone-600">Volte amanhã ou assine o Pro para gerar sem limite.</p>
          <Link href="/precos" className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 font-semibold text-white">Ver planos</Link>
        </div>
      ) : (
        <form action={generatePinAction} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-4">
          <input type="hidden" name="productId" value={id} />
          <fieldset>
            <legend className="text-sm font-semibold">Estilo da imagem</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {STYLE_IDS.map((s) => {
                const ok = styleAvailable(s, claims);
                return (
                  <label key={s} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${ok ? "border-stone-300 hover:border-brand" : "cursor-not-allowed border-stone-200 bg-stone-50 text-stone-400"}`}>
                    <input type="radio" name="style" value={s} defaultChecked={ok && s === currentStyle} disabled={!ok} className="mt-1" />
                    <span><span className="font-medium">{STYLE_LABELS[s]}</span><br /><span className="text-xs text-stone-500">{ok ? STYLE_HINT[s] : "Indisponível: produto fora de alta"}</span></span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm">Tom da legenda:{" "}
              <select name="tone" defaultValue={pin?.tone ?? "direto"} className="rounded border border-stone-300 px-2 py-1">
                {TONES.map((t) => <option key={t} value={t}>{TONE_LABELS[t]}</option>)}
              </select>
            </label>
            <button className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark">{pin ? "Gerar de novo" : "Gerar pin"}</button>
            {pin && limit !== null && <span className="text-xs text-stone-500">Trocar estilo ou tom do mesmo produto não gasta outro pin.</span>}
          </div>
        </form>
      )}

      {pin && (
        <div className="mt-6 grid gap-6 md:grid-cols-[300px_1fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/pin/${pin.id}?v=${pin.style}-${pin.tone}`} alt={`Pin: ${pin.productName}`} width={300} height={450} className="w-full rounded-xl border border-stone-200 shadow-sm" />
            <a href={`/api/pin/${pin.id}?download=1`} className="mt-3 block rounded-lg bg-ink py-2 text-center text-sm font-semibold text-white hover:opacity-90">Baixar imagem (PNG)</a>
            <p className="mt-2 text-xs text-stone-500">Estilo: {STYLE_LABELS[currentStyle]} · 1000×1500 (2:3 do Pinterest).{pin.productSource === "mock" && " Foto de teste: uso interno, não publique."}</p>
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
