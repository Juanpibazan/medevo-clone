import { describe, expect, it } from "vitest";
import {
  isStrictCalendarDate,
  maxExamDateInSaoPaulo,
  parseAvailabilityStep,
  parseExamDateStep,
  resolveOnboardingStepQuery,
  strictStringFormData,
  todayInSaoPaulo,
  type Clock,
} from "@/modules/identity/domain/onboarding";

const leapClock: Clock = { now: () => new Date("2024-02-29T15:00:00Z") };
describe("onboarding domain", () => {
  it("uses Sao Paulo calendar dates and clamps Feb 29 two years ahead", () => {
    expect(todayInSaoPaulo(leapClock)).toBe("2024-02-29");
    expect(maxExamDateInSaoPaulo(leapClock)).toBe("2026-02-28");
  });
  it("validates strict real calendar dates and inclusive bounds", () => {
    expect(isStrictCalendarDate("2024-02-30")).toBe(false);
    expect(
      parseExamDateStep(
        { dateChoice: "known", examDate: "2024-02-29" },
        leapClock,
      ).success,
    ).toBe(true);
    expect(
      parseExamDateStep(
        { dateChoice: "known", examDate: "2026-02-28" },
        leapClock,
      ).success,
    ).toBe(true);
    expect(
      parseExamDateStep(
        { dateChoice: "known", examDate: "2026-03-01" },
        leapClock,
      ),
    ).toEqual({ success: false, code: "date_out_of_range" });
  });
  it("accepts unknown date only with an empty date", () => {
    expect(
      parseExamDateStep({ dateChoice: "unknown", examDate: "" }, leapClock),
    ).toEqual({ success: true, data: { tentativeExamDate: null } });
    expect(
      parseExamDateStep(
        { dateChoice: "unknown", examDate: "2025-01-01" },
        leapClock,
      ).success,
    ).toBe(false);
  });
  it("normalizes presets and comma or point half-hours", () => {
    expect(
      parseAvailabilityStep({ hoursChoice: "7", customHours: "" }),
    ).toEqual({ success: true, data: { weeklyStudyMinutes: 420 } });
    expect(
      parseAvailabilityStep({ hoursChoice: "custom", customHours: "1,5" }),
    ).toEqual({ success: true, data: { weeklyStudyMinutes: 90 } });
    expect(
      parseAvailabilityStep({ hoursChoice: "custom", customHours: "40.5" })
        .success,
    ).toBe(false);
    expect(
      parseAvailabilityStep({ hoursChoice: "custom", customHours: "2.25" })
        .success,
    ).toBe(false);
  });
  it("canonicalizes invalid and future step queries while allowing prior steps", () => {
    expect(resolveOnboardingStepQuery(undefined, 2)).toEqual({
      step: 2,
      canonical: false,
    });
    expect(resolveOnboardingStepQuery("3", 2)).toEqual({
      step: 2,
      canonical: false,
    });
    expect(resolveOnboardingStepQuery("1", 2)).toEqual({
      step: 1,
      canonical: true,
    });
  });
  it("rejects duplicate and extra form fields", () => {
    const duplicate = new FormData();
    duplicate.append("locale", "es");
    duplicate.append("locale", "pt-BR");
    expect(strictStringFormData(duplicate, ["locale"])).toBeNull();
    const extra = new FormData();
    extra.set("locale", "es");
    extra.set("role", "admin");
    expect(strictStringFormData(extra, ["locale"])).toBeNull();

    const frameworkMetadata = new FormData();
    frameworkMetadata.set("locale", "es");
    frameworkMetadata.set("$ACTION_KEY", "opaque");
    expect(strictStringFormData(frameworkMetadata, ["locale"])).toEqual({
      locale: "es",
    });
  });
});
