import { cancelSubscriptionAction, startCheckoutAction } from "@/app/actions";
import { Shell } from "@/components/ui";
import { getContainer } from "@/lib/container";
import { formatBRL } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { pending: "Aguardando pagamento", active: "Ativa", overdue: "Pagamento em atraso", canceled: "Cancelada" };

export default async function Conta({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const user = await requireUser();
  const { ok } = await searchParams;
  const c = await getContainer();
  const [plan, sub, used] = await Promise.all([c.billing.planFor(user.id), c.billing.latestSubscription(user.id), c.entitlements.sheetsUsedToday(user.id)]);
  return (
    <Shell user={user} plan={plan}>
      <h1 className="text-2xl font-bold">Minha conta</h1>
      {ok && <p className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-800">Evento de pagamento processado.</p>}
      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-6 text-sm">
        <p>E-mail: <b>{user.email}</b></p>
        <p className="mt-1">Plano: <b>{plan === "pro" ? "Pro" : "Grátis"}</b></p>
        {plan === "free" && <p className="mt-1 text-stone-600">Fichas vistas hoje: {used}/{c.env.FREE_SHEETS_PER_DAY}</p>}
        {sub && <p className="mt-1 text-stone-600">Assinatura: {STATUS[sub.status] ?? sub.status} · {sub.billingType} · {formatBRL(sub.priceCents)}/mês{sub.currentPeriodEnd && sub.status === "active" ? ` · válida até ${sub.currentPeriodEnd.toLocaleDateString("pt-BR")}` : ""}</p>}
      </div>

      {plan === "free" && (
        <form action={startCheckoutAction} className="mt-6 rounded-xl border-2 border-brand bg-white p-6">
          <h2 className="text-lg font-semibold">Assinar o Pro por {formatBRL(c.env.PLAN_PRICE_CENTS)}/mês</h2>
          <fieldset className="mt-3 flex flex-wrap gap-4 text-sm">
            {[["PIX", "Pix"], ["BOLETO", "Boleto"], ["CREDIT_CARD", "Cartão"]].map(([v, l], i) => (
              <label key={v} className="flex items-center gap-2"><input type="radio" name="billingType" value={v} defaultChecked={i === 0} /> {l}</label>
            ))}
          </fieldset>
          <button className="mt-4 rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark">Continuar para o pagamento</button>
          {c.billing.providerKind === "mock" && <p className="mt-2 text-xs text-amber-700">Pagamento simulado (Asaas não conectado).</p>}
        </form>
      )}
      {sub && sub.status !== "canceled" && (
        <form action={cancelSubscriptionAction} className="mt-4"><button className="text-sm text-stone-500 underline hover:text-red-600">Cancelar assinatura</button></form>
      )}
    </Shell>
  );
}
