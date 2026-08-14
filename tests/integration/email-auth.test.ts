// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db/client";
import { users } from "@/db/schema";
import { auth } from "@/modules/identity/infrastructure/auth";

describe("Email Verification Integration Tests", () => {
  afterAll(() => pool.end());

  it("should create user with emailVerified=false and reject signin with EMAIL_NOT_VERIFIED", async () => {
    const email = `${randomUUID()}@verification-test.com`;
    const password = "password12345678";
    const name = "Verification Student";

    let createdUserId = "";

    try {
      // 1. Sign up the user via Better Auth API
      const signUpResult = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
        },
      });

      expect(signUpResult).toBeDefined();
      expect(signUpResult.user).toBeDefined();
      expect(signUpResult.user.email).toBe(email);
      expect(signUpResult.user.emailVerified).toBe(false); // requireEmailVerification=true makes it false initially

      createdUserId = signUpResult.user.id;

      // 2. Verify that trying to login directly throws or returns EMAIL_NOT_VERIFIED error
      await expect(
        auth.api.signInEmail({
          body: {
            email,
            password,
          },
        }),
      ).rejects.toThrow("Email not verified");

      // 3. Manually set emailVerified=true in DB to simulate clicking the email link
      await db
        .update(users)
        .set({ emailVerified: true })
        .where(eq(users.id, createdUserId));

      // 4. Try signing in again, it should succeed now
      const signInResult = await auth.api.signInEmail({
        body: {
          email,
          password,
        },
      });

      expect(signInResult).toBeDefined();
      expect(signInResult.user).toBeDefined();
      expect(signInResult.user.email).toBe(email);
      expect(signInResult.user.emailVerified).toBe(true);
    } finally {
      // Cleanup
      if (createdUserId) {
        await db.delete(users).where(eq(users.id, createdUserId));
      }
    }
  });
});
