import { describe, expect, it } from "vitest";
import {
  ProfileService,
  type ProfilePatch,
  type ProfileRepository,
} from "@/modules/identity/application/profile-service";
import type {
  Clock,
  StudentProfile,
} from "@/modules/identity/domain/onboarding";

class MemoryProfiles implements ProfileRepository {
  constructor(public profile: StudentProfile) {}
  async findByUserId() {
    return { ...this.profile };
  }
  async getUserRoles() {
    return ["student"];
  }
  async updateLocked<T>(
    _userId: string,
    mutate: (profile: StudentProfile) => { patch: ProfilePatch; result: T },
  ) {
    const next = mutate({ ...this.profile });
    this.profile = { ...this.profile, ...next.patch };
    return next.result;
  }
}
const clock: Clock = { now: () => new Date("2026-08-08T15:00:00Z") };
const initial = (): StudentProfile => ({
  locale: "pt-BR",
  examGoal: "revalida",
  tentativeExamDate: null,
  weeklyStudyMinutes: null,
  onboardingStatus: "not_started",
  onboardingCompletedStep: 0,
});
describe("ProfileService", () => {
  it("advances monotonically and permits editing a previous step", async () => {
    const repo = new MemoryProfiles(initial());
    const service = new ProfileService(repo, clock);
    expect(
      (await service.saveExamDate("u", { dateChoice: "unknown", examDate: "" }))
        .kind,
    ).toBe("invalid_sequence");
    await service.saveLanguage("u", { locale: "es" });
    await service.saveExamDate("u", { dateChoice: "unknown", examDate: "" });
    await service.saveLanguage("u", { locale: "pt-BR" });
    expect(repo.profile).toMatchObject({
      locale: "pt-BR",
      onboardingStatus: "in_progress",
      onboardingCompletedStep: 2,
    });
  });
  it("revalidates the aggregate and treats completed onboarding as terminal", async () => {
    const repo = new MemoryProfiles(initial());
    const service = new ProfileService(repo, clock);
    await service.saveLanguage("u", { locale: "es" });
    await service.saveExamDate("u", {
      dateChoice: "known",
      examDate: "2026-08-08",
    });
    await service.saveAvailability("u", {
      hoursChoice: "custom",
      customHours: "5,5",
    });
    expect(repo.profile).toMatchObject({
      weeklyStudyMinutes: 330,
      onboardingStatus: "completed",
      onboardingCompletedStep: 3,
    });
    const replay = await service.saveLanguage("u", { locale: "pt-BR" });
    expect(replay.kind).toBe("completed");
    expect(repo.profile.locale).toBe("es");
  });
  it("blocks completion when a previously saved date is no longer current", async () => {
    const repo = new MemoryProfiles({
      ...initial(),
      locale: "es",
      tentativeExamDate: "2026-08-07",
      onboardingStatus: "in_progress",
      onboardingCompletedStep: 2,
    });
    const service = new ProfileService(repo, clock);
    expect(
      (
        await service.saveAvailability("u", {
          hoursChoice: "5",
          customHours: "",
        })
      ).kind,
    ).toBe("invalid_profile");
    expect(repo.profile.onboardingCompletedStep).toBe(2);
  });
});
