import { notFound } from "next/navigation";
import { simulatePaymentAction } from "@/app/actions";
import { Shell } from "@/components/ui";
import { getContainer } from "@/lib/container";
import { formatBRL } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Substitui a página de pagamento do Asaas enquanto BILLING_PROVIDER=mock. */
export default async function CheckoutSimulado({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const c = await getContainer();
  const sub = await c.billing.latestSubscription(user.id);
  if (c.billing.providerKind !== "mock" || !sub || sub.providerSubscriptionId !== id) notFound();
  return (
    <Shell user={user}>
      <div className="mx-auto max-w-md rounded-xl border-2 border-dashed border-amber-400 bg-white p-6">
        <p className="text-xs font-semibold uppercase text-amber-700">Pagamento simulado, nenhuma cobrança real</p>
        <h1 className="mt-2 text-xl font-bold">Radar Pro: {formatBRL(sub.priceCents)}/mês</h1>
        <p className="mt-1 text-sm text-stone-600">Forma: {sub.billingType} · assinatura {sub.providerSubscriptionId}</p>
        <form action={simulatePaymentAction} className="mt-5 space-y-2">
          <input type="hidden" name="subscriptionId" value={id} />
          <button name="evento" value="confirmar" className="w-full rounded-lg bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-700">Simular pagamento confirmado</button>
          <button name="evento" value="vencer" className="w-full rounded-lg border border-stone-300 py-2 text-sm hover:bg-stone-50">Simular cobrança vencida</button>
          <button name="evento" value="cancelar" className="w-full rounded-lg border border-stone-300 py-2 text-sm hover:bg-stone-50">Simular cancelamento</button>
        </form>
      </div>
    </Shell>
  );
}
