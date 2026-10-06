import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { claimsFor, generateCaption, LIMITS, DISCLOSURE, TONES, type CaptionInput } from "@/domain/generator/caption";
import { buildPinSvg, renderPinPng, wrapText, PIN_HEIGHT, PIN_WIDTH } from "./pin-image";
import { MockAffiliateLinkProvider, ShopeeAffiliateLinkProvider } from "./links";
import { buildContainer, type Container } from "@/lib/container";
import { Resvg } from "@resvg/resvg-js";
import { join } from "node:path";
import { buildPinSvgByStyle, STYLE_IDS } from "./pin-design";
import { cta, headlineFor, socialProof } from "./pin-design/common";

const base: CaptionInput = {
  productId: "coz-001", name: "Kit Potes Herméticos de Vidro 10 Peças", category: "cozinha",
  priceCents: 8990, rating: 4.8, ratingCount: 1200, sales30d: 1432, tone: "direto",
};

describe("generateCaption", () => {
  it.each(TONES)("tom %s: respeita limites, traz aviso de afiliado e hashtags", (tone) => {
    const c = generateCaption({ ...base, tone });
    expect(c.title.length).toBeLessThanOrEqual(LIMITS.title);
    expect(c.description.length).toBeLessThanOrEqual(LIMITS.description);
    expect(c.description).toContain(DISCLOSURE);
    expect(c.description).toContain("#publi");
    expect(c.hashtags.length).toBeGreaterThan(0);
    expect(c.hashtags.length).toBeLessThanOrEqual(LIMITS.maxHashtags);
    expect(c.description).toContain("R$ 89,90");
  });

  it("é determinístico e os tons diferem", () => {
    expect(generateCaption(base)).toEqual(generateCaption(base));
    const bodies = new Set(TONES.map((t) => generateCaption({ ...base, tone: t }).description));
    expect(bodies.size).toBe(3);
  });

  it("nome gigante não estoura os limites", () => {
    const c = generateCaption({ ...base, name: "Produto ".repeat(80) });
    expect(c.title.length).toBeLessThanOrEqual(LIMITS.title);
    expect(c.description.length).toBeLessThanOrEqual(LIMITS.description);
    expect(c.description).toContain(DISCLOSURE);
  });

  it("só afirma o que os dados sustentam", () => {
    const novo = generateCaption({ ...base, ratingCount: 3, rating: 5, sales30d: 4 });
    expect(novo.description).not.toMatch(/avalia|vendidos|nota/i);
    const nota_baixa = generateCaption({ ...base, rating: 4.0, sales30d: 4 });
    expect(nota_baixa.description).not.toMatch(/nota|vendidos/i);
    const ok = generateCaption(base);
    expect(ok.description).toContain("1.400 vendidos"); // 1.432 arredonda PARA BAIXO
    expect(ok.description).not.toContain("1.432");
  });

  it("nunca promete o que não temos", () => {
    for (const tone of TONES) {
      // O aviso de afiliado cita "comissão" de propósito; o resto da legenda não pode citá-la.
      const d = generateCaption({ ...base, tone }).description.replace(DISCLOSURE, "").toLowerCase();
      for (const bad of ["frete grátis", "melhor do brasil", "mais vendido do", "garantid", "comissão"]) expect(d).not.toContain(bad);
    }
  });
});

describe("links", () => {
  const p = new MockAffiliateLinkProvider();
  it("determinístico, falso (.invalid) e com subIds", async () => {
    const a = await p.createLink({ productUrl: "https://shopee.com.br/x", subIds: ["pinterest", "cozinha", "ab12"] });
    const b = await p.createLink({ productUrl: "https://shopee.com.br/x", subIds: ["pinterest", "cozinha", "ab12"] });
    expect(a).toEqual(b);
    expect(new URL(a.url).hostname.endsWith(".invalid")).toBe(true);
    expect(a.url).toContain("pinterest_cozinha_ab12");
    expect((await p.createLink({ productUrl: "https://shopee.com.br/y", subIds: ["pinterest"] })).url).not.toBe(a.url);
  });
  it("adapter da Shopee ainda não conectado", () => {
    expect(() => new ShopeeAffiliateLinkProvider().createLink()).toThrow(/aguardando acesso/);
  });
});

describe("imagem do pin", () => {
  const input = { name: "Kit Potes Herméticos & <b>Vidro</b>", category: "cozinha" as const, priceCents: 8990, rating: 4.8, ratingCount: 1200 };

  it("escapa XML e nunca mostra comissão", () => {
    const svg = buildPinSvg(input);
    expect(svg).toContain("&amp;");
    expect(svg).not.toContain("<b>");
    expect(svg.toLowerCase()).not.toContain("comiss");
    expect(svg).toContain("Link de afiliado");
  });
  it("sem avaliações suficientes não mostra nota", () => {
    expect(buildPinSvg({ ...input, ratingCount: 2 })).not.toContain("avaliações");
  });
  it("wrapText limita linhas", () => {
    const lines = wrapText("palavra ".repeat(100), 64, 840, 3);
    expect(lines).toHaveLength(3);
    expect(lines[2]!.endsWith("…")).toBe(true);
  });
  it("PNG válido 1000×1500 e determinístico", () => {
    const a = renderPinPng(input);
    expect(a.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(a.readUInt32BE(16)).toBe(PIN_WIDTH);
    expect(a.readUInt32BE(20)).toBe(PIN_HEIGHT);
    expect(a.equals(renderPinPng(input))).toBe(true);
    expect(a.length).toBeGreaterThan(10_000); // texto renderizado, não imagem vazia
  });
});

describe("GeneratorService", () => {
  let c: Container;
  let now = new Date("2026-10-06T15:00:00Z");
  beforeEach(async () => { now = new Date("2026-10-06T15:00:00Z"); c = await buildContainer({ FREE_PINS_PER_DAY: "1" }, { inMemoryDb: true, now: () => now }); });
  afterEach(() => c.close());
  const user = async (e = "g@x.com") => (await c.auth.signIn(e)).user;

  it("grátis: 1 produto/dia; trocar o tom do mesmo não gasta; link é reaproveitado", async () => {
    const u = await user();
    const first = await c.generator.generate(u.id, "free", "coz-001", "direto");
    expect(first.status).toBe("ok");
    const again = await c.generator.generate(u.id, "free", "coz-001", "lista");
    expect(again.status).toBe("ok");
    if (first.status === "ok" && again.status === "ok") {
      expect(again.pin.id).toBe(first.pin.id);
      expect(again.pin.affiliateUrl).toBe(first.pin.affiliateUrl);
      expect(again.pin.tone).toBe("lista");
      expect(again.pin.description).not.toBe(first.pin.description);
    }
    expect(await c.generator.generate(u.id, "free", "coz-002", "direto")).toEqual({ status: "limit", used: 1, limit: 1 });
    expect(await c.generator.usedToday(u.id)).toBe(1);
  });
  it("pro é ilimitado; dia seguinte zera; produto inexistente", async () => {
    const u = await user("p@x.com");
    for (const id of ["coz-001", "coz-002", "coz-003"]) expect((await c.generator.generate(u.id, "pro", id, "direto")).status).toBe("ok");
    const f = await user("f@x.com");
    await c.generator.generate(f.id, "free", "lim-001", "direto");
    expect((await c.generator.generate(f.id, "free", "lim-002", "direto")).status).toBe("limit");
    now = new Date("2026-10-07T15:00:00Z");
    expect((await c.generator.generate(f.id, "free", "lim-002", "direto")).status).toBe("ok");
    expect((await c.generator.generate(u.id, "pro", "nope", "direto")).status).toBe("not_found");
  });
  it("gerações simultâneas não furam o limite", async () => {
    const f = await user("race@x.com");
    const r = await Promise.all(["coz-001", "coz-002", "coz-003", "lim-001"].map((id) => c.generator.generate(f.id, "free", id, "direto")));
    expect(r.filter((x) => x.status === "ok")).toHaveLength(1);
  });
  it("só o dono acessa o pin", async () => {
    const a = await user("a@x.com");
    const b = await user("b@x.com");
    const r = await c.generator.generate(a.id, "free", "coz-001", "direto");
    if (r.status !== "ok") throw new Error("esperava ok");
    expect(await c.generator.getOwnedPin(a.id, r.pin.id)).not.toBeNull();
    expect(await c.generator.getOwnedPin(b.id, r.pin.id)).toBeNull();
  });
});

describe("regra de 'em alta' (claimsFor)", () => {
  const base = { rating: 4.8, ratingCount: 500 };
  it("só afirma com volume e ritmo suficientes, arredondando PARA BAIXO", () => {
    // 504 em 7d (72/dia) vs 1505 em 30d (50,2/dia): +43,5% → 40
    expect(claimsFor({ ...base, sales30d: 1505, sales7d: 504 }).trendPct).toBe(40);
    // ritmo igual ao da média: sem destaque
    expect(claimsFor({ ...base, sales30d: 1500, sales7d: 350 }).trendPct).toBeUndefined();
    // +25% (abaixo do mínimo de 30%): sem destaque
    expect(claimsFor({ ...base, sales30d: 1500, sales7d: 437 }).trendPct).toBeUndefined();
  });
  it("volume baixo nunca vira 'em alta'", () => {
    expect(claimsFor({ ...base, sales30d: 40, sales7d: 30 }).trendPct).toBeUndefined(); // < 50 em 30d
    expect(claimsFor({ ...base, sales30d: 300, sales7d: 15 }).trendPct).toBeUndefined(); // < 20 em 7d
    expect(claimsFor({ ...base, sales30d: 1500 }).trendPct).toBeUndefined(); // sem dado de 7d
  });
});

describe("pin: título por benefício, prova social e botão", () => {
  const input = { productId: "coz-011", productName: "Balança Digital de Cozinha 10kg", category: "cozinha" as const, priceCents: 24120, rating: 4.7, ratingCount: 1583, sales30d: 1505, sales7d: 504, photo: null };

  it("título vem do tipo de produto; sem palavra-chave usa a categoria", () => {
    expect(headlineFor("cozinha", "x", "Balança Digital")).toBe("Receitas na medida certa");
    expect(headlineFor("organizacao", "x", "Organizador de Geladeira")).toBe("Tudo no seu lugar");
    expect(headlineFor("cozinha", "x", "Coisa sem palavra-chave")).toMatch(/cozinha|dia|Achado/i);
  });
  it("prova social só com vendas ≥ 50, arredondada para baixo", () => {
    expect(socialProof(input)).toBe("+1.500 vendidos em 30 dias");
    expect(socialProof({ ...input, sales30d: 30 })).toBeNull();
  });
  it("'em alta' para o comprador não mostra percentual nem gráfico", () => {
    for (const style of ["emalta", "emaltaclaro"] as const) {
      const svg = buildPinSvgByStyle(style, input);
      expect(svg).toContain("+1.500 vendidos em 30 dias");
      const visible = [...svg.matchAll(/>([^<]+)</g)].map((m) => m[1]).join(" "); // só o texto que aparece
      expect(visible).not.toContain("%");
      expect(svg).not.toContain("polyline");
      expect(visible).not.toMatch(/ritmo|semana|média/i);
      expect(visible.toLowerCase()).not.toContain("comiss");
    }
  });
  it("todos os estilos geram PNG 1000×1500 com a fonte embutida", () => {
    for (const style of STYLE_IDS) {
      const svg = buildPinSvgByStyle(style, input);
      const png = new Resvg(svg, { font: { fontFiles: ["Poppins_500Medium", "Poppins_600SemiBold", "Poppins_700Bold", "Poppins_800ExtraBold", "Pacifico_400Regular"].map((f) => join(process.cwd(), "assets/fonts", `${f}.ttf`)), loadSystemFonts: false, defaultFontFamily: "Poppins" } }).render();
      expect([png.width, png.height]).toEqual([1000, 1500]);
      expect(png.asPng().length).toBeGreaterThan(20_000);
    }
  });
  it("botão: o texto fica dentro da pílula (centro à esquerda da seta)", () => {
    const svg = cta(70, 1340, { fill: "#000", text: "#fff", w: 380, h: 90 });
    const cx = Number(/<text x="([\d.]+)"/.exec(svg)![1]);
    expect(cx).toBeGreaterThan(70 + 100);
    expect(cx).toBeLessThan(70 + 380 - 100);
  });
});
