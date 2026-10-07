"use server";

import { redirect } from "next/navigation";
import { BILLING_TYPES, type BillingType } from "@/billing";
import { MOCK_WEBHOOK_TOKEN } from "@/billing/mock-billing";
import { TONES, type Tone } from "@/domain/generator/caption";
import { isPinStyle } from "@/generator/pin-design";
import { getContainer } from "@/lib/container";
import { clearSessionCookie, requireUser, setSessionCookie } from "@/lib/session";

export async function loginAction(formData: FormData) {
  const c = await getContainer();
  const email = String(formData.get("email") ?? "");
  let token: string;
  try {
    ({ token } = await c.auth.signIn(email));
  } catch {
    redirect("/login?erro=email");
  }
  await setSessionCookie(token);
  redirect("/radar");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}

export async function startCheckoutAction(formData: FormData) {
  const user = await requireUser();
  const c = await getContainer();
  const type = String(formData.get("billingType")) as BillingType;
  if (!BILLING_TYPES.includes(type)) redirect("/conta?erro=forma");
  const { checkoutUrl } = await c.billing.startCheckout(user, type);
  redirect(checkoutUrl);
}

export async function cancelSubscriptionAction() {
  const user = await requireUser();
  await (await getContainer()).billing.cancel(user.id);
  redirect("/conta");
}

const SIMULATED = {
  confirmar: "PAYMENT_CONFIRMED",
  vencer: "PAYMENT_OVERDUE",
  cancelar: "SUBSCRIPTION_DELETED",
} as const;

/** Só existe com BILLING_PROVIDER=mock: monta um webhook no formato do Asaas e passa pelo caminho real. */
export async function simulatePaymentAction(formData: FormData) {
  const user = await requireUser();
  const c = await getContainer();
  if (c.billing.providerKind !== "mock") redirect("/conta");
  const subId = String(formData.get("subscriptionId"));
  const sub = await c.billing.latestSubscription(user.id);
  if (!sub || sub.providerSubscriptionId !== subId) redirect("/conta");
  const kind = String(formData.get("evento")) as keyof typeof SIMULATED;
  const event = SIMULATED[kind];
  if (!event) redirect("/conta");
  const id = `evt_sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const body =
    event === "SUBSCRIPTION_DELETED"
      ? { id, event, dateCreated: new Date().toISOString(), subscription: { id: subId } }
      : { id, event, dateCreated: new Date().toISOString(), payment: { id: `pay_sim_${id}`, subscription: subId } };
  await c.billing.handleWebhook((n) => (n.toLowerCase() === "asaas-access-token" ? MOCK_WEBHOOK_TOKEN : null), body);
  redirect("/conta?ok=1");
}

export async function generatePinAction(formData: FormData) {
  const user = await requireUser();
  const c = await getContainer();
  const productId = String(formData.get("productId"));
  const tone = String(formData.get("tone"));
  const style = String(formData.get("style") ?? "minimalista");
  if (!(TONES as readonly string[]).includes(tone) || !isPinStyle(style)) redirect(`/gerador/${productId}`);
  const plan = await c.billing.planFor(user.id);
  const r = await c.generator.generate(user.id, plan, productId, tone as Tone, style);
  if (r.status === "not_found") redirect("/gerador");
  const flag = r.status === "limit" ? "?limite=1" : r.status === "style_unavailable" ? "?estilo=indisponivel" : "";
  redirect(`/gerador/${productId}${flag}`);
}
