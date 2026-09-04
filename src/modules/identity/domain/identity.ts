import { z } from "zod";

export const supportedLocales = ["pt-BR", "es"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
});
export const registrationSchema = credentialsSchema
  .extend({
    firstName: z.string().trim().min(2).max(50).optional(),
    lastName: z.string().trim().min(2).max(50).optional(),
    name: z.string().trim().min(2).max(100).optional(),
    locale: z.enum(supportedLocales),
  })
  .strict()
  .refine(
    (data) =>
      Boolean(
        (data.firstName && data.lastName) ||
          (data.name && data.name.trim().length >= 2),
      ),
    { message: "Name is required" },
  );
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
