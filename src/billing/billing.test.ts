import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildContainer, type Container } from "@/lib/container";
import { MOCK_WEBHOOK_TOKEN } from "./mock-billing";
import { AsaasBillingProvider } from "./asaas-billing";
import { parseAsaasWebhook } from "./asaas-webhook";

const hdr = (token: string | null) => (n: string) => (n === "asaas-access-token" ? token : null);
const evt = (id: string, event: string, sub: string, dateCreated?: string) => ({ id, event, dateCreated, payment: { id: "pay_1", subscription: sub } });

describe("BillingService (mock)", () => {
  let c: Container;
  let clock = new Date("2026-10-06T12:00:00Z");
  beforeEach(async () => {
    clock = new Date("2026-10-06T12:00:00Z");
    c = await buildContainer({}, { inMemoryDb: true, now: () => clock });
  });
  afterEach(() => c.close());

  const newUser = async (email = "a@b.com") => (await c.auth.signIn(email)).user;

  it("começa grátis; checkout cria assinatura pendente (ainda grátis)", async () => {
    const u = await newUser();
    expect(await c.billing.planFor(u.id)).toBe("free");
    const co = await c.billing.startCheckout(u, "PIX");
    expect(co.checkoutUrl).toContain("/checkout/simulado/");
    expect((await c.billing.latestSubscription(u.id))!.status).toBe("pending");
    expect(await c.billing.planFor(u.id)).toBe("free");
  });

  it("pagamento confirmado → pro; vence em 30 dias", async () => {
    const u = await newUser();
    const co = await c.billing.startCheckout(u, "BOLETO");
    const r = await c.billing.handleWebhook(hdr(MOCK_WEBHOOK_TOKEN), evt("evt_1", "PAYMENT_CONFIRMED", co.subscriptionId, "2026-10-06T12:00:00Z"));
    expect(r).toBe("applied");
    expect(await c.billing.planFor(u.id)).toBe("pro");
    clock = new Date("2026-11-06T12:00:00Z");
    expect(await c.billing.planFor(u.id)).toBe("free");
  });

  it("webhook repetido é idempotente", async () => {
    const u = await newUser();
    const co = await c.billing.startCheckout(u, "PIX");
    const body = evt("evt_dup", "PAYMENT_RECEIVED", co.subscriptionId);
    expect(await c.billing.handleWebhook(hdr(MOCK_WEBHOOK_TOKEN), body)).toBe("applied");
    expect(await c.billing.handleWebhook(hdr(MOCK_WEBHOOK_TOKEN), body)).toBe("duplicate");
  });

  it("token errado → unauthorized, nada muda", async () => {
    const u = await newUser();
    const co = await c.billing.startCheckout(u, "PIX");
    expect(await c.billing.handleWebhook(hdr("errado"), evt("e", "PAYMENT_CONFIRMED", co.subscriptionId))).toBe("unauthorized");
    expect(await c.billing.handleWebhook(hdr(null), evt("e", "PAYMENT_CONFIRMED", co.subscriptionId))).toBe("unauthorized");
    expect(await c.billing.planFor(u.id)).toBe("free");
  });

  it("overdue derruba para grátis; cancelada não ressuscita", async () => {
    const u = await newUser();
    const co = await c.billing.startCheckout(u, "CREDIT_CARD");
    await c.billing.handleWebhook(hdr(MOCK_WEBHOOK_TOKEN), evt("e1", "PAYMENT_CONFIRMED", co.subscriptionId));
    await c.billing.handleWebhook(hdr(MOCK_WEBHOOK_TOKEN), evt("e2", "PAYMENT_OVERDUE", co.subscriptionId));
    expect(await c.billing.planFor(u.id)).toBe("free");
    await c.billing.handleWebhook(hdr(MOCK_WEBHOOK_TOKEN), { id: "e3", event: "SUBSCRIPTION_DELETED", subscription: { id: co.subscriptionId } });
    await c.billing.handleWebhook(hdr(MOCK_WEBHOOK_TOKEN), evt("e4", "PAYMENT_CONFIRMED", co.subscriptionId));
    expect(await c.billing.planFor(u.id)).toBe("free");
    expect((await c.billing.latestSubscription(u.id))!.status).toBe("canceled");
  });

  it("eventos irrelevantes ou de assinatura desconhecida são ignorados", async () => {
    expect(await c.billing.handleWebhook(hdr(MOCK_WEBHOOK_TOKEN), evt("x1", "PAYMENT_CREATED", "sub_x"))).toBe("ignored");
    expect(await c.billing.handleWebhook(hdr(MOCK_WEBHOOK_TOKEN), evt("x2", "PAYMENT_CONFIRMED", "sub_desconhecida"))).toBe("ignored");
    expect(await c.billing.handleWebhook(hdr(MOCK_WEBHOOK_TOKEN), { lixo: true })).toBe("ignored");
  });

  it("cancelar pelo usuário", async () => {
    const u = await newUser();
    const co = await c.billing.startCheckout(u, "PIX");
    await c.billing.handleWebhook(hdr(MOCK_WEBHOOK_TOKEN), evt("e1", "PAYMENT_CONFIRMED", co.subscriptionId));
    await c.billing.cancel(u.id);
    expect(await c.billing.planFor(u.id)).toBe("free");
  });
});

describe("parseAsaasWebhook", () => {
  it("normaliza eventos", () => {
    expect(parseAsaasWebhook(evt("1", "PAYMENT_CONFIRMED", "sub_1"))?.type).toBe("payment_confirmed");
    expect(parseAsaasWebhook(evt("2", "PAYMENT_OVERDUE", "sub_1"))?.type).toBe("payment_overdue");
    expect(parseAsaasWebhook({ id: "3", event: "SUBSCRIPTION_INACTIVATED", subscription: { id: "sub_1" } })?.type).toBe("subscription_canceled");
    expect(parseAsaasWebhook(null)).toBeNull();
  });
});

describe("AsaasBillingProvider (fetch falso, sem rede)", () => {
  it("cria cliente, assinatura e devolve a URL da 1ª cobrança", async () => {
    const calls: { url: string; method: string; body: unknown; token: string }[] = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method!, body: init.body ? JSON.parse(init.body as string) : undefined, token: (init.headers as Record<string, string>).access_token! });
      const body = url.endsWith("/customers") ? { id: "cus_1" } : url.endsWith("/subscriptions") ? { id: "sub_1" } : { data: [{ invoiceUrl: "https://sandbox.asaas.com/i/abc" }] };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as typeof fetch;
    const p = new AsaasBillingProvider({ apiKey: "k", baseUrl: "https://x/api/v3", webhookToken: "t", fetchImpl: fakeFetch });
    const r = await p.createSubscription({ user: { id: "u1", email: "a@b.com", name: "A" }, billingType: "PIX", priceCents: 3900 });
    expect(r).toEqual({ customerId: "cus_1", subscriptionId: "sub_1", checkoutUrl: "https://sandbox.asaas.com/i/abc" });
    expect(calls.every((c) => c.token === "k")).toBe(true);
    expect((calls[1]!.body as { value: number; cycle: string }).value).toBe(39);
    expect((calls[1]!.body as { cycle: string }).cycle).toBe("MONTHLY");
  });

  it("erro HTTP vira exceção; webhook confere token", async () => {
    const f = (async () => new Response("nope", { status: 401 })) as unknown as typeof fetch;
    const p = new AsaasBillingProvider({ apiKey: "k", baseUrl: "https://x", webhookToken: "tok", fetchImpl: f });
    await expect(p.cancelSubscription("sub_1")).rejects.toThrow(/401/);
    expect(p.verifyWebhook(hdr("tok"))).toBe(true);
    expect(p.verifyWebhook(hdr("outro"))).toBe(false);
  });
});
