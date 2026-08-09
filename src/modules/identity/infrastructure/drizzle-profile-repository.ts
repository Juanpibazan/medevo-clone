import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import type {
  ProfilePatch,
  ProfileRepository,
} from "../application/profile-service";
import type { StudentProfile } from "../domain/onboarding";

function toProfile(row: typeof profiles.$inferSelect): StudentProfile {
  return {
    locale: row.locale,
    examGoal: "revalida",
    tentativeExamDate: row.tentativeExamDate,
    weeklyStudyMinutes: row.weeklyStudyMinutes,
    onboardingStatus: row.onboardingStatus,
    onboardingCompletedStep:
      row.onboardingCompletedStep as StudentProfile["onboardingCompletedStep"],
  };
}

function toRowPatch(patch: ProfilePatch) {
  return { ...patch, updatedAt: new Date() };
}

export class DrizzleProfileRepository implements ProfileRepository {
  async findByUserId(userId: string): Promise<StudentProfile | null> {
    const [row] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    return row ? toProfile(row) : null;
  }

  async updateLocked<T>(
    userId: string,
    mutate: (profile: StudentProfile) => { patch: ProfilePatch; result: T },
  ): Promise<T | null> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .for("update")
        .limit(1);
      if (!row) return null;
      const mutation = mutate(toProfile(row));
      if (Object.keys(mutation.patch).length > 0)
        await tx
          .update(profiles)
          .set(toRowPatch(mutation.patch))
          .where(eq(profiles.userId, userId));
      return mutation.result;
    });
  }
}
