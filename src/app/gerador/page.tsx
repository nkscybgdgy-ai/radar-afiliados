import Link from "next/link";
import { Shell } from "@/components/ui";
import { CATEGORY_LABELS, type HomeCategory } from "@/domain/types";
import { getContainer } from "@/lib/container";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Gerador() {
  const user = await requireUser();
  const c = await getContainer();
  const [plan, items] = await Promise.all([c.billing.planFor(user.id), c.generator.history(user.id)]);
  return (
    <Shell user={user} plan={plan}>
      <h1 className="text-2xl font-bold">Gerador de pins</h1>
      <p className="mt-2 text-sm text-stone-600">Escolha um produto no <Link href="/radar" className="text-brand hover:underline">radar</Link>, abra a ficha e clique em “Gerar pin”.</p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        {items.length === 0 ? <p className="p-6 text-sm text-stone-500">Nenhum pin gerado ainda.</p> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase text-stone-500"><tr><th className="p-3">Produto</th><th className="p-3">Categoria</th><th className="p-3">Dia</th><th className="p-3"></th></tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-stone-100">
                  <td className="p-3 font-medium">{p.productName}</td>
                  <td className="p-3">{CATEGORY_LABELS[p.category as HomeCategory]}</td>
                  <td className="p-3 tabular-nums">{p.day}</td>
                  <td className="p-3"><Link href={`/gerador/${p.productId}`} className="text-brand hover:underline">Abrir</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Shell>
  );
}
