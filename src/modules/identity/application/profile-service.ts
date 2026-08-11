import {
  languageStepSchema,
  parseAvailabilityStep,
  parseExamDateStep,
  validateProfileForCompletion,
  type Clock,
  type StudentProfile,
} from "../domain/onboarding";

export type ProfilePatch = Partial<
  Pick<
    StudentProfile,
    | "locale"
    | "tentativeExamDate"
    | "weeklyStudyMinutes"
    | "onboardingStatus"
    | "onboardingCompletedStep"
  >
>;
export interface ProfileRepository {
  findByUserId(userId: string): Promise<StudentProfile | null>;
  getUserRoles(userId: string): Promise<string[]>;
  updateLocked<T>(
    userId: string,
    mutate: (profile: StudentProfile) => { patch: ProfilePatch; result: T },
  ): Promise<T | null>;
}
export type ProfileUpdateResult =
  | { kind: "updated" | "completed"; profile: StudentProfile }
  | { kind: "invalid_sequence" | "invalid_profile" };
type InputError = {
  kind:
    "invalid_fields" | "invalid_date" | "date_out_of_range" | "invalid_hours";
};

function withPatch(
  profile: StudentProfile,
  patch: ProfilePatch,
): StudentProfile {
  return { ...profile, ...patch };
}

export class ProfileService {
  constructor(
    private readonly repository: ProfileRepository,
    private readonly clock: Clock,
  ) {}
  getProfile(userId: string) {
    return this.repository.findByUserId(userId);
  }
  getUserRoles(userId: string) {
    return this.repository.getUserRoles(userId);
  }

  async saveLanguage(
    userId: string,
    input: unknown,
  ): Promise<ProfileUpdateResult | { kind: "invalid_fields" }> {
    const parsed = languageStepSchema.safeParse(input);
    if (!parsed.success) return { kind: "invalid_fields" };
    const result = await this.repository.updateLocked<ProfileUpdateResult>(
      userId,
      (profile) => {
        if (profile.onboardingStatus === "completed")
          return { patch: {}, result: { kind: "completed", profile } as const };
        const patch: ProfilePatch = {
          locale: parsed.data.locale,
          onboardingStatus: "in_progress",
          onboardingCompletedStep: Math.max(
            profile.onboardingCompletedStep,
            1,
          ) as 1 | 2,
        };
        return {
          patch,
          result: {
            kind: "updated",
            profile: withPatch(profile, patch),
          } as const,
        };
      },
    );
    return result ?? { kind: "invalid_sequence" };
  }

  async saveExamDate(
    userId: string,
    input: unknown,
  ): Promise<ProfileUpdateResult | InputError> {
    const parsed = parseExamDateStep(input, this.clock);
    if (!parsed.success) return { kind: parsed.code };
    const result = await this.repository.updateLocked<ProfileUpdateResult>(
      userId,
      (profile) => {
        if (profile.onboardingStatus === "completed")
          return { patch: {}, result: { kind: "completed", profile } as const };
        if (profile.onboardingCompletedStep < 1)
          return { patch: {}, result: { kind: "invalid_sequence" } as const };
        const patch: ProfilePatch = {
          tentativeExamDate: parsed.data.tentativeExamDate,
          onboardingStatus: "in_progress",
          onboardingCompletedStep: 2,
        };
        return {
          patch,
          result: {
            kind: "updated",
            profile: withPatch(profile, patch),
          } as const,
        };
      },
    );
    return result ?? { kind: "invalid_sequence" };
  }

  async saveAvailability(
    userId: string,
    input: unknown,
  ): Promise<ProfileUpdateResult | InputError> {
    const parsed = parseAvailabilityStep(input);
    if (!parsed.success) return { kind: parsed.code };
    const result = await this.repository.updateLocked<ProfileUpdateResult>(
      userId,
      (profile) => {
        if (profile.onboardingStatus === "completed")
          return { patch: {}, result: { kind: "completed", profile } as const };
        if (profile.onboardingCompletedStep < 2)
          return { patch: {}, result: { kind: "invalid_sequence" } as const };
        const candidate = withPatch(profile, {
          weeklyStudyMinutes: parsed.data.weeklyStudyMinutes,
        });
        if (!validateProfileForCompletion(candidate, this.clock))
          return { patch: {}, result: { kind: "invalid_profile" } as const };
        const patch: ProfilePatch = {
          weeklyStudyMinutes: parsed.data.weeklyStudyMinutes,
          onboardingStatus: "completed",
          onboardingCompletedStep: 3,
        };
        return {
          patch,
          result: {
            kind: "updated",
            profile: withPatch(profile, patch),
          } as const,
        };
      },
    );
    return result ?? { kind: "invalid_sequence" };
  }

  async setLocalePreference(
    userId: string,
    input: unknown,
  ): Promise<ProfileUpdateResult | { kind: "invalid_fields" }> {
    const parsed = languageStepSchema.safeParse(input);
    if (!parsed.success) return { kind: "invalid_fields" };
    const result = await this.repository.updateLocked<ProfileUpdateResult>(
      userId,
      (profile) => {
        const patch: ProfilePatch = { locale: parsed.data.locale };
        return {
          patch,
          result: {
            kind: "updated",
            profile: withPatch(profile, patch),
          } as const,
        };
      },
    );
    return result ?? { kind: "invalid_sequence" };
  }
}
