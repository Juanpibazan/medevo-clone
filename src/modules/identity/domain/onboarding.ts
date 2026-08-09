import { z } from "zod";
import { supportedLocales, type SupportedLocale } from "./identity";

export type OnboardingCompletedStep = 0 | 1 | 2 | 3;
export type OnboardingStatus = "not_started" | "in_progress" | "completed";
export type ExamGoal = "revalida";

export interface StudentProfile {
  locale: SupportedLocale;
  examGoal: ExamGoal;
  tentativeExamDate: string | null;
  weeklyStudyMinutes: number | null;
  onboardingStatus: OnboardingStatus;
  onboardingCompletedStep: OnboardingCompletedStep;
}

export interface Clock {
  now(): Date;
}
export const systemClock: Clock = { now: () => new Date() };

export const languageStepSchema = z
  .object({ locale: z.enum(supportedLocales) })
  .strict();
const examStepSchema = z
  .object({ dateChoice: z.enum(["known", "unknown"]), examDate: z.string() })
  .strict();
const availabilityStepSchema = z
  .object({
    hoursChoice: z.enum(["3", "5", "7", "10", "custom"]),
    customHours: z.string(),
  })
  .strict();

type CalendarDate = { year: number; month: number; day: number };
const calendarFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatCalendarDate(value: CalendarDate): string {
  return `${value.year.toString().padStart(4, "0")}-${value.month.toString().padStart(2, "0")}-${value.day.toString().padStart(2, "0")}`;
}
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function todayInSaoPaulo(clock: Clock = systemClock): string {
  const parts = Object.fromEntries(
    calendarFormatter
      .formatToParts(clock.now())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function maxExamDateInSaoPaulo(clock: Clock = systemClock): string {
  const [year, month, day] = todayInSaoPaulo(clock).split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const targetYear = year + 2;
  return formatCalendarDate({
    year: targetYear,
    month,
    day: Math.min(day, daysInMonth(targetYear, month)),
  });
}

export function isStrictCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return (
    month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
  );
}

export type ParseResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      code:
        | "invalid_fields"
        | "invalid_date"
        | "date_out_of_range"
        | "invalid_hours";
    };

export function parseExamDateStep(
  input: unknown,
  clock: Clock = systemClock,
): ParseResult<{ tentativeExamDate: string | null }> {
  const parsed = examStepSchema.safeParse(input);
  if (!parsed.success) return { success: false, code: "invalid_fields" };
  if (parsed.data.dateChoice === "unknown")
    return parsed.data.examDate === ""
      ? { success: true, data: { tentativeExamDate: null } }
      : { success: false, code: "invalid_fields" };
  if (!isStrictCalendarDate(parsed.data.examDate))
    return { success: false, code: "invalid_date" };
  if (
    parsed.data.examDate < todayInSaoPaulo(clock) ||
    parsed.data.examDate > maxExamDateInSaoPaulo(clock)
  )
    return { success: false, code: "date_out_of_range" };
  return { success: true, data: { tentativeExamDate: parsed.data.examDate } };
}

export function parseAvailabilityStep(
  input: unknown,
): ParseResult<{ weeklyStudyMinutes: number }> {
  const parsed = availabilityStepSchema.safeParse(input);
  if (!parsed.success) return { success: false, code: "invalid_fields" };
  if (parsed.data.hoursChoice !== "custom") {
    if (parsed.data.customHours !== "")
      return { success: false, code: "invalid_fields" };
    return {
      success: true,
      data: { weeklyStudyMinutes: Number(parsed.data.hoursChoice) * 60 },
    };
  }
  const normalized = parsed.data.customHours.trim().replace(",", ".");
  if (!/^\d{1,2}(?:\.\d)?$/.test(normalized))
    return { success: false, code: "invalid_hours" };
  const hours = Number(normalized);
  if (hours < 1 || hours > 40 || hours * 2 !== Math.round(hours * 2))
    return { success: false, code: "invalid_hours" };
  return { success: true, data: { weeklyStudyMinutes: hours * 60 } };
}

export function pendingOnboardingStep(profile: StudentProfile): 1 | 2 | 3 {
  return Math.min(profile.onboardingCompletedStep + 1, 3) as 1 | 2 | 3;
}

export function resolveOnboardingStepQuery(
  value: string | string[] | undefined,
  pending: 1 | 2 | 3,
): { step: 1 | 2 | 3; canonical: boolean } {
  if (typeof value !== "string" || !/^[1-3]$/.test(value))
    return { step: pending, canonical: false };
  const step = Number(value) as 1 | 2 | 3;
  return step <= pending
    ? { step, canonical: true }
    : { step: pending, canonical: false };
}

export function strictStringFormData(
  formData: FormData,
  keys: readonly string[],
): Record<string, string> | null {
  // Next.js adds reserved action metadata to submitted FormData. It is not
  // application input and must be excluded before enforcing our allowlist.
  const actualKeys = [...formData.keys()].filter(
    (key) => !key.startsWith("$ACTION_"),
  );
  if (
    actualKeys.length !== keys.length ||
    keys.some((key) => formData.getAll(key).length !== 1) ||
    actualKeys.some((key) => !keys.includes(key))
  )
    return null;
  const entries = keys.map((key) => [key, formData.get(key)] as const);
  if (entries.some(([, value]) => typeof value !== "string")) return null;
  return Object.fromEntries(entries) as Record<string, string>;
}

export function validateProfileForCompletion(
  profile: StudentProfile,
  clock: Clock = systemClock,
): boolean {
  const dateValid =
    profile.tentativeExamDate === null ||
    (isStrictCalendarDate(profile.tentativeExamDate) &&
      profile.tentativeExamDate >= todayInSaoPaulo(clock) &&
      profile.tentativeExamDate <= maxExamDateInSaoPaulo(clock));
  const minutes = profile.weeklyStudyMinutes;
  return (
    supportedLocales.includes(profile.locale) &&
    profile.examGoal === "revalida" &&
    dateValid &&
    minutes !== null &&
    minutes >= 60 &&
    minutes <= 2400 &&
    minutes % 30 === 0
  );
}
