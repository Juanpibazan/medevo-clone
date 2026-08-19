import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

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
test("protects onboarding with a localized callback", async ({ page }) => {
  await page.goto("/es/onboarding?step=2");
  await expect(page).toHaveURL(
    /\/es\/entrar\?callbackUrl=%2Fes%2Fonboarding%3Fstep%3D2/,
  );
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

test("registers, resumes onboarding, blocks skips and shows the real summary", async ({
  page,
}, testInfo) => {
  const email = `e2e-${testInfo.project.name}-${Date.now()}@example.test`;
  const password = "a-secure-e2e-password";

  await page.goto("/es/cadastro");
  await page.getByLabel("Nombre").fill("Estudiante E2E");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page).toHaveURL(/\/es\/cadastro\/confirmar\?email=/);

  const { db } = await import("@/db/client");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.email, email));

  await page.goto("/es/entrar");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/es\/onboarding\?step=1$/);
  await expect(page.locator('select[name="locale"]')).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "Español" })).toBeChecked();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/es\/onboarding\?step=2$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();

  await page.reload();
  await expect(page).toHaveURL(/\/es\/onboarding\?step=2$/);
  await expect(
    page.getByRole("radio", { name: "Aún no lo sé" }),
  ).not.toBeChecked();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.goto("/es/entrar");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/es\/onboarding\?step=2$/);

  await page.goto("/es/onboarding?step=3");
  await expect(page).toHaveURL(/\/es\/onboarding\?step=2$/);
  await page.getByRole("radio", { name: "Aún no lo sé" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/es\/onboarding\?step=3$/);
  await page.reload();
  await expect(page.getByRole("radio", { name: "5 horas" })).not.toBeChecked();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.goto("/es/entrar");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/es\/onboarding\?step=3$/);

  await page.getByRole("radio", { name: "5 horas" }).check();
  await page.getByRole("button", { name: "Finalizar configuración" }).click();
  await expect(page).toHaveURL(/\/es\/app$/);
  await expect(
    page.getByRole("heading", { name: "Hola, Estudiante E2E" }),
  ).toBeVisible();
  await expect(page.getByText("5 h por semana")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.locator('select[name="locale"]').selectOption("pt-BR");
  await expect(page).toHaveURL(/\/pt-BR\/app$/);
  await expect(
    page.locator("dd").getByText("Português (Brasil)"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/pt-BR$/);

  await page.goto("/pt-BR/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/pt-BR\/app$/);
});
