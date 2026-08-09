"use server";

import { cookies, headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import {
  auth,
  pendingOnboardingStep,
  profileService,
  strictStringFormData,
  supportedLocales,
  type StudentProfile,
  type SupportedLocale,
} from "@/modules/identity";
import { LOCALE_COOKIE_NAME } from "@/i18n/routing";

export type OnboardingActionError =
  | "invalid_fields"
  | "invalid_date"
  | "date_out_of_range"
  | "invalid_hours"
  | "invalid_sequence"
  | "invalid_profile";
export type OnboardingActionState = { error: OnboardingActionError | null };

function isLocale(value: string): value is SupportedLocale {
  return supportedLocales.includes(value as SupportedLocale);
}
async function sessionUserId(routeLocale: string): Promise<string> {
  const locale = isLocale(routeLocale) ? routeLocale : "pt-BR";
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    redirect(
      `/${locale}/entrar?callbackUrl=${encodeURIComponent(`/${locale}/onboarding`)}`,
      RedirectType.replace,
    );
  return session.user.id;
}
async function setLocaleCookie(locale: SupportedLocale) {
  (await cookies()).set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    sameSite: "lax",
  });
}
function destination(profile: StudentProfile): string {
  return profile.onboardingStatus === "completed"
    ? `/${profile.locale}/app`
    : `/${profile.locale}/onboarding?step=${pendingOnboardingStep(profile)}`;
}

export async function saveLanguageAction(
  routeLocale: string,
  _state: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const userId = await sessionUserId(routeLocale);
  const input = strictStringFormData(formData, ["locale"]);
  if (!input) return { error: "invalid_fields" };
  const result = await profileService.saveLanguage(userId, input);
  if (result.kind !== "updated" && result.kind !== "completed")
    return { error: result.kind };
  await setLocaleCookie(result.profile.locale);
  redirect(destination(result.profile), RedirectType.replace);
}

export async function saveExamDateAction(
  routeLocale: string,
  _state: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const userId = await sessionUserId(routeLocale);
  const input = strictStringFormData(formData, ["dateChoice", "examDate"]);
  if (!input) return { error: "invalid_fields" };
  const result = await profileService.saveExamDate(userId, input);
  if (result.kind !== "updated" && result.kind !== "completed")
    return { error: result.kind };
  redirect(destination(result.profile), RedirectType.replace);
}

export async function saveAvailabilityAction(
  routeLocale: string,
  _state: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const userId = await sessionUserId(routeLocale);
  const input = strictStringFormData(formData, ["hoursChoice", "customHours"]);
  if (!input) return { error: "invalid_fields" };
  const result = await profileService.saveAvailability(userId, input);
  if (result.kind !== "updated" && result.kind !== "completed")
    return { error: result.kind };
  redirect(destination(result.profile), RedirectType.replace);
}
