import { test, expect } from "@playwright/test";

test("complete practice and review flow", async ({ page }, testInfo) => {
  const email = `practice-e2e-${testInfo.project.name}-${Date.now()}@example.test`;
  const password = "a-secure-e2e-practice-password";

  // 1. Sign up a new user
  await page.goto("/es/cadastro");
  await page.getByLabel("Nombre").fill("Estudiante de Práctica");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page).toHaveURL(/\/es\/onboarding\?step=1$/);

  // Complete step 1
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/es\/onboarding\?step=2$/);

  // Complete step 2
  await page.getByRole("radio", { name: "Aún no lo sé" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/es\/onboarding\?step=3$/);

  // Complete step 3
  await page.getByRole("radio", { name: "5 horas" }).check();
  await page.getByRole("button", { name: "Finalizar configuración" }).click();
  await expect(page).toHaveURL(/\/es\/app$/);

  // 2. Start practice session from dashboard
  await page
    .getByRole("button", { name: "Iniciar Práctica (10 Preguntas)" })
    .click();
  await expect(page).toHaveURL(/\/es\/app\/practice\/[a-f0-9-]+$/);

  // Verify practice view has the question header and alternatives
  await expect(page.getByText("Pregunta 1 de 10")).toBeVisible();

  // Select alternative A
  await page.locator("button:has-text('A')").first().click();

  // Click Verify
  await page.getByRole("button", { name: "Verificar respuesta" }).click();

  // Verify correction panel is visible (shows Correcto! or Incorrecto)
  await expect(
    page
      .locator("h4:has-text('¡Correcto!')")
      .or(page.locator("h4:has-text('Incorrecto')")),
  ).toBeVisible();

  // Click a metacognitive mark (e.g., 'Dominé')
  await page.getByRole("button", { name: "Dominé" }).click();

  // Mark as favorite
  await page.getByRole("button", { name: "★" }).click();

  // Navigate to Question 2
  await page.getByRole("button", { name: "2" }).first().click();
  await expect(page.getByText("Pregunta 2 de 10")).toBeVisible();

  // Click "Finalizar práctica"
  await page.getByRole("button", { name: "Finalizar práctica" }).click();
  await expect(page).toHaveURL(/\/es\/app\/practice\/[a-f0-9-]+\/results$/);

  // Check Results Page has precision score
  await expect(page.getByText("Resultados de la sesión")).toBeVisible();
  await expect(page.getByText("Precisión")).toBeVisible();

  // Click Cuaderno de Errores link
  await page.getByRole("link", { name: "Ver Cuaderno de Errores" }).click();
  await expect(page).toHaveURL(/\/es\/app\/errors$/);
});
