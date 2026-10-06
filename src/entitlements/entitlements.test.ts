import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildContainer, type Container } from "@/lib/container";
import { dailySalesFromSnapshots } from "@/jobs/daily-snapshot";
import { schema } from "@/db";

describe("auth dev", () => {
  let c: Container;
  beforeEach(async () => { c = await buildContainer({ AUTH_SECRET: "segredo-de-teste-123456" }, { inMemoryDb: true }); });
  afterEach(() => c.close());

  it("login cria usuário uma vez e o token verifica", async () => {
    const a = await c.auth.signIn("Ana@Casa.com");
    const b = await c.auth.signIn("ana@casa.com");
    expect(a.user.id).toBe(b.user.id);
    expect((await c.auth.verifySession(a.token))?.email).toBe("ana@casa.com");
  });
  it("rejeita e-mail inválido, token adulterado e ausente", async () => {
    await expect(c.auth.signIn("sem-arroba")).rejects.toThrow();
    const { token } = await c.auth.signIn("x@y.com");
    expect(await c.auth.verifySession(token + "a")).toBeNull();
    expect(await c.auth.verifySession("outro-id." + token.split(".")[1])).toBeNull();
    expect(await c.auth.verifySession(undefined)).toBeNull();
  });
});

describe("limites do plano grátis", () => {
  let c: Container;
  beforeEach(async () => { c = await buildContainer({ FREE_SHEETS_PER_DAY: "2" }, { inMemoryDb: true }); });
  afterEach(() => c.close());

  it("2 fichas/dia; rever a mesma não gasta; pro é ilimitado", async () => {
    const { user } = await c.auth.signIn("u@x.com");
    const e = c.entitlements;
    expect((await e.consumeSheet(user.id, "free", "p1")).allowed).toBe(true);
    expect((await e.consumeSheet(user.id, "free", "p1")).used).toBe(1);
    expect((await e.consumeSheet(user.id, "free", "p2")).allowed).toBe(true);
    const blocked = await e.consumeSheet(user.id, "free", "p3");
    expect(blocked).toEqual({ allowed: false, used: 2, limit: 2 });
    expect((await e.consumeSheet(user.id, "free", "p1")).allowed).toBe(true);
    expect((await e.consumeSheet(user.id, "pro", "p3")).allowed).toBe(true);
  });
  it("radar limitado e detalhamento só no pro", () => {
    expect(c.entitlements.radarLimit("free")).toBe(10);
    expect(c.entitlements.radarLimit("pro")).toBeNull();
    expect(c.entitlements.canSeeBreakdown("free")).toBe(false);
    expect(c.entitlements.canSeeBreakdown("pro")).toBe(true);
  });
  it("dia seguinte zera o contador", async () => {
    let now = new Date("2026-10-06T15:00:00Z");
    const c2 = await buildContainer({ FREE_SHEETS_PER_DAY: "1" }, { inMemoryDb: true, now: () => now });
    const { user } = await c2.auth.signIn("d@x.com");
    await c2.entitlements.consumeSheet(user.id, "free", "p1");
    expect((await c2.entitlements.consumeSheet(user.id, "free", "p2")).allowed).toBe(false);
    now = new Date("2026-10-07T15:00:00Z");
    expect((await c2.entitlements.consumeSheet(user.id, "free", "p2")).allowed).toBe(true);
    await c2.close();
  });
});

describe("job diário", () => {
  it("grava 60 snapshots, é idempotente no dia e registra a execução", async () => {
    const c = await buildContainer({}, { inMemoryDb: true });
    expect((await c.snapshotJob.run()).products).toBe(60);
    await c.snapshotJob.run();
    const snaps = await c.db.select().from(schema.productSnapshots);
    expect(snaps).toHaveLength(60);
    expect(await c.db.select().from(schema.jobRuns)).toHaveLength(2);
    await c.close();
  });
  it("vendas diárias = diferença do acumulado entre dias", async () => {
    const c = await buildContainer({}, { inMemoryDb: true });
    const base = { productId: "p", priceCents: 1000, commissionRate: 1000, ratingStar: 45, ratingCount: 10, source: "mock" };
    await c.db.insert(schema.productSnapshots).values([
      { ...base, day: "2026-10-04", salesTotal: 100 },
      { ...base, day: "2026-10-05", salesTotal: 130 },
      { ...base, day: "2026-10-06", salesTotal: 135 },
    ]);
    const h = await dailySalesFromSnapshots(c.db, "p", 10, new Date("2026-10-06T15:00:00Z"));
    expect(h).toEqual([{ date: "2026-10-05", sales: 30 }, { date: "2026-10-06", sales: 5 }]);
    await c.close();
  });
});
