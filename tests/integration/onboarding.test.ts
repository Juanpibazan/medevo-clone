// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db/client";
import { profiles, users } from "@/db/schema";
import { ensureStudentProvisioning } from "@/modules/identity/infrastructure/provisioning";
import { ProfileService } from "@/modules/identity/application/profile-service";
import { DrizzleProfileRepository } from "@/modules/identity/infrastructure/drizzle-profile-repository";
import type { Clock } from "@/modules/identity/domain/onboarding";

const clock: Clock = { now: () => new Date("2026-08-08T15:00:00Z") };
const service = new ProfileService(new DrizzleProfileRepository(), clock);
async function createStudent(locale: "pt-BR" | "es" = "pt-BR") {
  const id = randomUUID();
  await db
    .insert(users)
    .values({ id, name: "Onboarding", email: `${id}@example.test` });
  await ensureStudentProvisioning(id, locale);
  return id;
}
async function remove(id: string) {
  await db.delete(users).where(eq(users.id, id));
}
describe("onboarding persistence", () => {
  afterAll(() => pool.end());
  it("enforces database constraints", async () => {
    const id = await createStudent();
    try {
      await expect(
        db
          .update(profiles)
          .set({ weeklyStudyMinutes: 75 })
          .where(eq(profiles.userId, id)),
      ).rejects.toThrow();
      await expect(
        db
          .update(profiles)
          .set({ onboardingCompletedStep: 4 })
          .where(eq(profiles.userId, id)),
      ).rejects.toThrow();
      await expect(
        db
          .update(profiles)
          .set({ examGoal: "other" })
          .where(eq(profiles.userId, id)),
      ).rejects.toThrow();
    } finally {
      await remove(id);
    }
  });
  it("isolates users and persists monotonic concurrent writes", async () => {
    const first = await createStudent();
    const second = await createStudent("es");
    try {
      await Promise.all([
        service.saveLanguage(first, { locale: "es" }),
        service.saveLanguage(first, { locale: "pt-BR" }),
      ]);
      const firstProfile = await service.getProfile(first);
      const secondProfile = await service.getProfile(second);
      expect(firstProfile?.onboardingCompletedStep).toBe(1);
      expect(["es", "pt-BR"]).toContain(firstProfile?.locale);
      expect(secondProfile).toMatchObject({
        locale: "es",
        onboardingCompletedStep: 0,
      });
    } finally {
      await remove(first);
      await remove(second);
    }
  });
  it("completes idempotently and keeps completed onboarding terminal", async () => {
    const id = await createStudent();
    try {
      await service.saveLanguage(id, { locale: "es" });
      await service.saveExamDate(id, { dateChoice: "unknown", examDate: "" });
      const [one, two] = await Promise.all([
        service.saveAvailability(id, { hoursChoice: "5", customHours: "" }),
        service.saveAvailability(id, { hoursChoice: "5", customHours: "" }),
      ]);
      expect([one.kind, two.kind].sort()).toEqual(["completed", "updated"]);
      await service.saveLanguage(id, { locale: "pt-BR" });
      expect(await service.getProfile(id)).toMatchObject({
        locale: "es",
        weeklyStudyMinutes: 300,
        onboardingStatus: "completed",
        onboardingCompletedStep: 3,
      });
    } finally {
      await remove(id);
    }
  });
});
