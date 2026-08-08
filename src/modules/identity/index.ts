export { auth } from "./infrastructure/auth";
export { authClient } from "./infrastructure/auth-client";
export { ensureStudentProvisioning } from "./infrastructure/provisioning";
export {
  credentialsSchema,
  recoverySchema,
  registrationSchema,
  sanitizeLocalizedCallback,
  supportedLocales,
} from "./domain/identity";
export type { SupportedLocale } from "./domain/identity";
export { requestPasswordRecovery } from "./application/email-service";
