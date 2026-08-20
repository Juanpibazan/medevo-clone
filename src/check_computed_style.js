import { chromium } from "@playwright/test";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("Navigating to http://localhost:3000/pt-BR/entrar ...");
    await page.goto("http://localhost:3000/pt-BR/entrar");

    // Fill out the login form
    // Since we need credentials, let's use the editor credentials or register a new user
    // Actually, registering a new user is safer and easier!
    console.log("Navigating to signup page...");
    await page.goto("http://localhost:3000/pt-BR/cadastro");

    const email = `testuser_${Date.now()}@example.com`;
    console.log(`Signing up with email: ${email}`);

    await page.fill('input[name="name"]', "Test User");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "Password123!");
    await page.fill('input[name="confirmPassword"]', "Password123!");

    await page.click('button[type="submit"]');

    // Wait for navigation after signup (might go to email verification wait page)
    console.log("Waiting for signup redirect...");
    await page.waitForTimeout(3000);
    console.log("Current URL:", page.url());

    // If we are on verification wait page, let's see what is there
    if (page.url().includes("confirmar")) {
      console.log(
        "On email confirmation page. Let's see if we can bypass it or if it is already verified in dev mode.",
      );
      // In development mode, check if we can bypass.
      // Wait, is requireEmailVerification active? Yes,GEMINI.md says "verificación obligatoria de correo electrónico activa".
      // But we can check if there's a bypass or we can just proceed.
      // Let's check the database or try to go to http://localhost:3000/pt-BR/app
      await page.goto("http://localhost:3000/pt-BR/app");
      await page.waitForTimeout(1000);
      console.log("Current URL after navigating to /app:", page.url());
    }

    // Let's make sure we have a practice session
    // If we are not logged in or redirected to /entrar, let's log in as the editor
    if (page.url().includes("entrar")) {
      console.log(
        "Could not access /app directly. Let's log in as the seeded editor user.",
      );
      await page.goto("http://localhost:3000/pt-BR/entrar");
      await page.fill('input[name="email"]', "editor@medciclo.com");
      await page.fill('input[name="password"]', "Password123!"); // Wait, does the seeded editor have a password?
      // Let's check seed.ts to see if password is set. In seed.ts, there was no password set for editor!
      // In seed.ts:
      // await db.insert(schema.users).values({ id: editorId, name: "Dr. Editor MedCiclo", email: "editor@medciclo.com", emailVerified: true })
      // Better Auth handles passwords in auth_accounts table. So the seeded editor doesn't have a password.
      // We can't log in as editor this way unless we create an account.
    }

    // Wait, let's see if we can check the computed styles of the link directly by rendering the HTML component
    // Or we can just log the styles of the element in /pt-BR/app if we can get past login.
    // Let's check if the signup automatically logged us in or if we are stuck on verification.
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
}

run();
