import { z } from "zod";

export const supportedLocales = ["pt-BR", "es"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
});
export const registrationSchema = credentialsSchema
  .extend({
    name: z.string().trim().min(2).max(100),
    locale: z.enum(supportedLocales),
  })
  .strict();
export const recoverySchema = z
  .object({ email: z.string().trim().email().max(254) })
  .strict();

export function sanitizeLocalizedCallback(
  value: string | null | undefined,
  locale: SupportedLocale,
): string {
  const fallback = `/${locale}/app`;
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return fallback;
  try {
    const url = new URL(value, "http://local.invalid");
    const localized = supportedLocales.some(
      (item) =>
        url.pathname === `/${item}` || url.pathname.startsWith(`/${item}/`),
    );
    return url.origin === "http://local.invalid" && localized
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
