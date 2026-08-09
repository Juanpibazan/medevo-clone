// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db/client";
import { profiles, userRoles, users } from "@/db/schema";
import { ensureStudentProvisioning } from "@/modules/identity/infrastructure/provisioning";
describe("student provisioning", () => {
  afterAll(() => pool.end());
  it("is idempotent and repairs profile plus role", async () => {
    const id = randomUUID();
    await db
      .insert(users)
      .values({ id, name: "Integration", email: `${id}@example.test` });
    try {
      await ensureStudentProvisioning(id, "es");
      await ensureStudentProvisioning(id, "pt-BR");
      const profile = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, id));
      const assignments = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.userId, id));
      expect(profile).toHaveLength(1);
      expect(profile[0]?.locale).toBe("es");
      expect(assignments).toEqual([
        expect.objectContaining({ roleCode: "student" }),
      ]);
    } finally {
      await db.delete(users).where(eq(users.id, id));
    }
  });

  it("enforces email uniqueness under concurrent inserts", async () => {
    const email = `${randomUUID()}@example.test`;
    const ids = [randomUUID(), randomUUID()];
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          db.insert(users).values({ id, name: "Concurrent", email }),
        ),
      );
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === "rejected"),
      ).toHaveLength(1);
      const persisted = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      expect(persisted).toHaveLength(1);
    } finally {
      for (const id of ids) await db.delete(users).where(eq(users.id, id));
    }
  });

  it("rolls back provisioning when the user does not exist", async () => {
    const missingUserId = randomUUID();
    await expect(
      ensureStudentProvisioning(missingUserId, "es"),
    ).rejects.toThrow();
    await expect(
      db.select().from(profiles).where(eq(profiles.userId, missingUserId)),
    ).resolves.toHaveLength(0);
    await expect(
      db.select().from(userRoles).where(eq(userRoles.userId, missingUserId)),
    ).resolves.toHaveLength(0);
  });
});
