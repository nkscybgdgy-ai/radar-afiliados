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
