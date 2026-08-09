"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { StudentProfile, SupportedLocale } from "@/modules/identity";
import {
  saveAvailabilityAction,
  saveExamDateAction,
  saveLanguageAction,
  type OnboardingActionState,
} from "@/app/[locale]/(student)/onboarding/actions";

type Step = 1 | 2 | 3;
const initialOnboardingActionState: OnboardingActionState = { error: null };
export function OnboardingForm({
  locale,
  profile,
  step,
  minExamDate,
  maxExamDate,
}: {
  locale: SupportedLocale;
  profile: StudentProfile;
  step: Step;
  minExamDate: string;
  maxExamDate: string;
}) {
  const t = useTranslations("onboarding");
  const action = (
    step === 1
      ? saveLanguageAction
      : step === 2
        ? saveExamDateAction
        : saveAvailabilityAction
  ).bind(null, locale);
  const [state, formAction, pending] = useActionState(
    action,
    initialOnboardingActionState,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [dateChoice, setDateChoice] = useState<"" | "known" | "unknown">(
    profile.onboardingCompletedStep >= 2
      ? profile.tentativeExamDate
        ? "known"
        : "unknown"
      : "",
  );
  const preset =
    profile.onboardingCompletedStep >= 3 &&
    profile.weeklyStudyMinutes &&
    [180, 300, 420, 600].includes(profile.weeklyStudyMinutes)
      ? String(profile.weeklyStudyMinutes / 60)
      : profile.onboardingCompletedStep >= 3 && profile.weeklyStudyMinutes
        ? "custom"
        : "";
  const [hoursChoice, setHoursChoice] = useState(preset);
  const [customHours, setCustomHours] = useState(
    profile.weeklyStudyMinutes && preset === "custom"
      ? String(profile.weeklyStudyMinutes / 60).replace(
          ".",
          locale === "es" ? "," : ".",
        )
      : "",
  );
  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state.error]);
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  return (
    <div className="onboarding-card">
      <ol className="stepper" aria-label={t("progressLabel")}>
        {([1, 2, 3] as const).map((item) => (
          <li
            key={item}
            className={
              item === step
                ? "is-current"
                : item <= profile.onboardingCompletedStep
                  ? "is-complete"
                  : ""
            }
            aria-current={item === step ? "step" : undefined}
          >
            <span aria-hidden="true">{item}</span>
            {t(`steps.${item}`)}
          </li>
        ))}
      </ol>
      <div className="onboarding-copy">
        <p className="eyebrow">{t("eyebrow", { step })}</p>
        <h1 ref={headingRef} tabIndex={-1}>
          {t(`step${step}.title`)}
        </h1>
        <p className="card-intro">{t(`step${step}.intro`)}</p>
      </div>
      <form className="form onboarding-form" action={formAction} noValidate>
        {step === 1 && (
          <fieldset
            aria-describedby={state.error ? "onboarding-error" : undefined}
          >
            <legend>{t("step1.legend")}</legend>
            <p className="exam-note">
              <strong>{t("step1.examLabel")}</strong>
              {t("step1.examValue")}
            </p>
            <div className="choice-grid">
              {(["pt-BR", "es"] as const).map((value) => (
                <label className="choice" key={value}>
                  <input
                    type="radio"
                    name="locale"
                    value={value}
                    defaultChecked={
                      (profile.onboardingCompletedStep === 0
                        ? locale
                        : profile.locale) === value
                    }
                  />
                  <span>{t(`step1.locales.${value}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {step === 2 && (
          <fieldset
            aria-describedby={state.error ? "onboarding-error" : undefined}
          >
            <legend>{t("step2.legend")}</legend>
            <div className="choice-grid">
              <label className="choice">
                <input
                  type="radio"
                  name="dateChoice"
                  value="known"
                  checked={dateChoice === "known"}
                  onChange={() => setDateChoice("known")}
                />
                <span>{t("step2.known")}</span>
              </label>
              <label className="choice">
                <input
                  type="radio"
                  name="dateChoice"
                  value="unknown"
                  checked={dateChoice === "unknown"}
                  onChange={() => setDateChoice("unknown")}
                />
                <span>{t("step2.unknown")}</span>
              </label>
            </div>
            {dateChoice === "known" ? (
              <div className="field">
                <label htmlFor="examDate">{t("step2.dateLabel")}</label>
                <input
                  id="examDate"
                  name="examDate"
                  type="date"
                  min={minExamDate}
                  max={maxExamDate}
                  defaultValue={profile.tentativeExamDate ?? ""}
                  required
                  aria-describedby="date-help"
                />
                <p id="date-help" className="field-help">
                  {t("step2.dateHelp")}
                </p>
              </div>
            ) : (
              <input type="hidden" name="examDate" value="" />
            )}
          </fieldset>
        )}
        {step === 3 && (
          <fieldset
            aria-describedby={state.error ? "onboarding-error" : undefined}
          >
            <legend>{t("step3.legend")}</legend>
            <div className="choice-grid hours-grid">
              {["3", "5", "7", "10"].map((value) => (
                <label className="choice" key={value}>
                  <input
                    type="radio"
                    name="hoursChoice"
                    value={value}
                    checked={hoursChoice === value}
                    onChange={() => setHoursChoice(value)}
                  />
                  <span>{t("step3.hours", { hours: value })}</span>
                </label>
              ))}
              <label className="choice">
                <input
                  type="radio"
                  name="hoursChoice"
                  value="custom"
                  checked={hoursChoice === "custom"}
                  onChange={() => setHoursChoice("custom")}
                />
                <span>{t("step3.custom")}</span>
              </label>
            </div>
            <input
              type="hidden"
              name="customHours"
              value={hoursChoice === "custom" ? customHours : ""}
            />
            {hoursChoice === "custom" && (
              <div className="field">
                <label htmlFor="customHoursVisible">
                  {t("step3.customLabel")}
                </label>
                <input
                  id="customHoursVisible"
                  inputMode="decimal"
                  value={customHours}
                  onChange={(event) =>
                    setCustomHours(event.currentTarget.value)
                  }
                  aria-describedby="hours-help"
                  required
                />
                <p id="hours-help" className="field-help">
                  {t("step3.customHelp")}
                </p>
              </div>
            )}
          </fieldset>
        )}
        {state.error && (
          <p
            className="error action-error"
            id="onboarding-error"
            role="alert"
            tabIndex={-1}
            ref={errorRef}
          >
            {t(`errors.${state.error}`)}
          </p>
        )}
        <div className="form-actions">
          {step > 1 && (
            <Link
              className="secondary-button"
              href={`/onboarding?step=${step - 1}`}
            >
              {t("back")}
            </Link>
          )}
          <button className="button" type="submit" disabled={pending}>
            {pending ? t("saving") : step === 3 ? t("finish") : t("continue")}
          </button>
        </div>
      </form>
    </div>
  );
}
