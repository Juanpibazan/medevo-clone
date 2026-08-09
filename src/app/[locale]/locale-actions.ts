"use server";

import { cookies, headers } from "next/headers";
import {
  auth,
  ensureStudentProvisioning,
  languageStepSchema,
  profileService,
} from "@/modules/identity";
import { LOCALE_COOKIE_NAME } from "@/i18n/routing";

export type LocalePreferenceResult =
  { ok: true } | { ok: false; error: "invalid_locale" | "save_failed" };

export async function setLocalePreference(
  value: unknown,
): Promise<LocalePreferenceResult> {
  const parsed = languageStepSchema.safeParse({ locale: value });
  if (!parsed.success) return { ok: false, error: "invalid_locale" };
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session) {
      await ensureStudentProvisioning(session.user.id, parsed.data.locale);
      const result = await profileService.setLocalePreference(
        session.user.id,
        parsed.data,
      );
      if (result.kind !== "updated" && result.kind !== "completed")
        return { ok: false, error: "save_failed" };
    }
    (await cookies()).set(LOCALE_COOKIE_NAME, parsed.data.locale, {
      path: "/",
      sameSite: "lax",
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "save_failed" };
  }
}
