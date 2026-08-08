import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("redirects root and renders an accessible localized landing page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(pt-BR|es)$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("protects the student area and preserves a safe callback", async ({
  page,
}) => {
  await page.goto("/es/app");
  await expect(page).toHaveURL(/\/es\/entrar\?callbackUrl=%2Fes%2Fapp/);
});
test("switches locale while preserving the current route", async ({ page }) => {
  await page.goto("/pt-BR/entrar");
  await page.locator('select[name="locale"]').selectOption("es");
  await expect(page).toHaveURL(/\/es\/entrar$/);
  await expect(
    page.getByRole("heading", { name: "Continúa tu ciclo" }),
  ).toBeVisible();
});
test("recovery acknowledgement does not enumerate accounts", async ({
  page,
}) => {
  await page.goto("/es/recuperar-senha");
  await page.getByLabel("Correo electrónico").fill("unknown@example.test");
  await page.getByRole("button", { name: "Solicitar recuperación" }).click();
  await expect(page.getByRole("status")).toBeVisible();
});

test("registers, persists the session, signs out and signs in again", async ({
  page,
}, testInfo) => {
  const email = `e2e-${testInfo.project.name}-${Date.now()}@example.test`;
  const password = "a-secure-e2e-password";

  await page.goto("/es/cadastro");
  await page.getByLabel("Nombre").fill("Estudiante E2E");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page).toHaveURL(/\/es\/app$/);
  await expect(
    page.getByRole("heading", { name: "Hola, Estudiante E2E" }),
  ).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/es\/app$/);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/es$/);

  await page.goto("/es/entrar");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/es\/app$/);
});
