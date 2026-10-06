import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv: trava de custo", () => {
  it("padrões são 100% locais e R$ 39", () => {
    const e = loadEnv({});
    expect([e.DATA_SOURCE, e.AUTH_PROVIDER, e.BILLING_PROVIDER, e.DB_DRIVER]).toEqual(["mock", "dev", "mock", "pglite"]);
    expect(e.PLAN_PRICE_CENTS).toBe(3900);
  });
  it.each([{ AUTH_PROVIDER: "supabase" }, { BILLING_PROVIDER: "asaas" }, { DB_DRIVER: "postgres" }])(
    "%o é bloqueado sem ALLOW_PAID_SERVICES",
    (o) => expect(() => loadEnv(o)).toThrow(/bloqueado antes do lançamento/),
  );
  it("liberado com ALLOW_PAID_SERVICES=true", () => {
    expect(loadEnv({ BILLING_PROVIDER: "asaas", ALLOW_PAID_SERVICES: "true" }).BILLING_PROVIDER).toBe("asaas");
  });
  it("preço configurável", () => expect(loadEnv({ PLAN_PRICE_CENTS: "4900" }).PLAN_PRICE_CENTS).toBe(4900));
});
