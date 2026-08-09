export { auth } from "./infrastructure/auth";
export { authClient } from "./infrastructure/auth-client";
export { ensureStudentProvisioning } from "./infrastructure/provisioning";
export { profileService } from "./infrastructure/profile-service";
export { ProfileService } from "./application/profile-service";
export type {
  ProfileRepository,
  ProfilePatch,
  ProfileUpdateResult,
} from "./application/profile-service";
export {
  languageStepSchema,
  maxExamDateInSaoPaulo,
  parseAvailabilityStep,
  parseExamDateStep,
  pendingOnboardingStep,
  resolveOnboardingStepQuery,
  strictStringFormData,
  systemClock,
  todayInSaoPaulo,
  validateProfileForCompletion,
} from "./domain/onboarding";
export type {
  Clock,
  OnboardingCompletedStep,
  OnboardingStatus,
  StudentProfile,
} from "./domain/onboarding";
export {
  credentialsSchema,
  recoverySchema,
  registrationSchema,
  sanitizeLocalizedCallback,
  supportedLocales,
} from "./domain/identity";
export type { SupportedLocale } from "./domain/identity";
export { requestPasswordRecovery } from "./application/email-service";
