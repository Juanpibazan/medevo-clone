import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "../../messages/es.json";
import { OnboardingForm } from "@/components/onboarding-form";
import type { StudentProfile } from "@/modules/identity";

vi.mock("@/app/[locale]/(student)/onboarding/actions", () => ({
  saveLanguageAction: vi.fn(async () => ({ error: "invalid_fields" })),
  saveExamDateAction: vi.fn(async () => ({ error: "invalid_fields" })),
  saveAvailabilityAction: vi.fn(async () => ({ error: "invalid_fields" })),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
const profile: StudentProfile = {
  locale: "es",
  examGoal: "revalida",
  tentativeExamDate: null,
  weeklyStudyMinutes: null,
  onboardingStatus: "not_started",
  onboardingCompletedStep: 0,
};
function renderForm(step: 1 | 2 | 3, overrides: Partial<StudentProfile> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <OnboardingForm
        locale="es"
        profile={{ ...profile, ...overrides }}
        step={step}
        minExamDate="2026-08-08"
        maxExamDate="2028-08-08"
      />
    </NextIntlClientProvider>,
  );
}
describe("OnboardingForm", () => {
  it("uses a semantic current step and keyboard-operable native radios", async () => {
    const user = userEvent.setup();
    renderForm(1);
    expect(
      screen.getByText("Objetivo e idioma", { selector: "li" }),
    ).toHaveAttribute("aria-current", "step");
    const portuguese = screen.getByRole("radio", {
      name: "Portugués (Brasil)",
    });
    const spanish = screen.getByRole("radio", { name: "Español" });
    expect(spanish).toBeChecked();
    portuguese.focus();
    await user.keyboard("{ArrowDown}");
    expect(spanish).toBeChecked();
  });
  it("reveals a custom-hours input and surfaces a focusable action error", async () => {
    const user = userEvent.setup();
    renderForm(3, {
      onboardingStatus: "in_progress",
      onboardingCompletedStep: 2,
    });
    await user.click(screen.getByRole("radio", { name: "Otro tiempo" }));
    expect(screen.getByLabelText("Horas por semana")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Finalizar configuración" }),
    );
    const error = await screen.findByRole("alert");
    expect(error).toHaveFocus();
  });

  it("requires an explicit first choice for date and weekly availability", () => {
    const dateView = renderForm(2, {
      onboardingStatus: "in_progress",
      onboardingCompletedStep: 1,
    });
    expect(
      screen.getByRole("radio", { name: "Ya tengo una fecha" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Aún no lo sé" }),
    ).not.toBeChecked();
    dateView.unmount();

    renderForm(3, {
      onboardingStatus: "in_progress",
      onboardingCompletedStep: 2,
    });
    expect(screen.getByRole("radio", { name: "5 horas" })).not.toBeChecked();
  });

  it("keeps a previously completed step visually current when reviewing it", () => {
    renderForm(2, {
      onboardingStatus: "in_progress",
      onboardingCompletedStep: 2,
    });
    const current = screen.getByText("Fecha", { selector: "li" });
    expect(current).toHaveClass("is-current");
    expect(current).not.toHaveClass("is-complete");
  });
});
