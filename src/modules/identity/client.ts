export { authClient } from "./infrastructure/auth-client";
export {
  credentialsSchema,
  registrationSchema,
  resetPasswordSchema,
  sanitizeLocalizedCallback,
} from "./domain/identity";
export type { SupportedLocale } from "./domain/identity";
