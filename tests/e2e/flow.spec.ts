import { expect, test } from "@playwright/test";

const email = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@teste.com`;

async function login(page: import("@playwright/test").Page, e: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", e);
  await page.click("text=Continuar");
  await page.waitForURL("**/radar");
}

test("visitante é levado ao login", async ({ page }) => {
  await page.goto("/radar");
  await expect(page).toHaveURL(/\/login/);
});

test("plano grátis: top 10, detalhamento bloqueado, limite de fichas", async ({ page }) => {
  await login(page, email());
  await expect(page.locator("tbody tr")).toHaveCount(10);
  await expect(page.getByText(/Plano grátis mostra o top 10 de 60/)).toBeVisible();

  const links = await page.locator("tbody a").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!));
  for (const href of links.slice(0, 5)) {
    await page.goto(href);
    await expect(page.getByText("Score de oportunidade")).toBeVisible();
    await expect(page.getByText("Pro").first()).toBeVisible(); // detalhamento travado
  }
  await page.goto(links[5]!);
  await expect(page.getByText("Limite diário de fichas atingido")).toBeVisible();
  await page.goto(links[0]!); // rever uma já vista continua liberado
  await expect(page.getByText("Score de oportunidade")).toBeVisible();
});

test("assinatura simulada: Pix → pago → pro; vencida → grátis", async ({ page }) => {
  await login(page, email());
  await page.goto("/conta");
  await expect(page.getByText("Plano: Grátis")).toBeVisible();
  await page.click("text=Continuar para o pagamento");
  await expect(page).toHaveURL(/\/checkout\/simulado\/sub_mock_/);
  const checkout = page.url();
  await expect(page.getByText("nenhuma cobrança real")).toBeVisible();

  await page.click("text=Simular pagamento confirmado");
  await expect(page).toHaveURL(/\/conta\?ok=1/);
  await expect(page.getByText("Plano: Pro")).toBeVisible();

  await page.goto("/radar");
  await expect(page.locator("tbody tr")).toHaveCount(60);
  await page.locator("tbody a").first().click();
  await expect(page.getByText("🔒")).toHaveCount(0); // detalhamento liberado

  // cobrança vence: volta para o grátis
  await page.goto(checkout);
  await page.click("text=Simular cobrança vencida");
  await expect(page.getByText("Plano: Grátis")).toBeVisible();
  await expect(page.getByText(/Pagamento em atraso/)).toBeVisible();
});

test("gerador: 1 pin/dia no grátis, imagem PNG, só o dono acessa", async ({ page, playwright, baseURL }) => {
  await login(page, email());
  const links = await page.locator("tbody a").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!));
  const productId = (i: number) => links[i]!.split("/").pop()!;

  await page.goto(`/gerador/${productId(0)}`);
  await page.getByRole("button", { name: "Gerar pin" }).click();
  const img = page.locator("img[alt^='Pin:']");
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBe(1000);
  await expect(page.getByText(/#publi/).first()).toBeVisible();
  await expect(page.getByText("Link de demonstração")).toBeVisible();

  const src = (await img.getAttribute("src"))!;
  const own = await page.request.get(src);
  expect(own.status()).toBe(200);
  expect(own.headers()["content-type"]).toBe("image/png");
  const anon = await playwright.request.newContext({ baseURL });
  expect((await anon.get(src)).status()).toBe(401);

  // trocar o tom do mesmo produto não gasta outro pin
  await page.selectOption("select[name=tone]", "lista");
  await page.getByRole("button", { name: "Gerar de novo" }).click();
  await expect(page.getByText("1/1 pin por dia")).toBeVisible();

  // outro produto: limite do dia
  await page.goto(`/gerador/${productId(1)}`);
  await expect(page.getByText("Você já usou o pin de hoje.")).toBeVisible();
});
