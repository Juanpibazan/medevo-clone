import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExamSwitcher } from "@/components/exam-switcher";

const { refresh, switchExamAction } = vi.hoisted(() => ({
  refresh: vi.fn(),
  switchExamAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/app/[locale]/(student)/app/exam-actions", () => ({
  switchExamAction,
}));

describe("ExamSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders both exam buttons with correct active state when currentExam is revalida", () => {
    render(<ExamSwitcher currentExam="revalida" />);

    const revalidaBtn = screen.getByRole("button", { name: "Revalida" });
    const enamedBtn = screen.getByRole("button", { name: "ENAMED" });

    expect(revalidaBtn).toHaveAttribute("aria-pressed", "true");
    expect(enamedBtn).toHaveAttribute("aria-pressed", "false");
    expect(revalidaBtn.className).toContain("bg-[#102A43]");
  });

  it("renders both exam buttons with correct active state when currentExam is enamed", () => {
    render(<ExamSwitcher currentExam="enamed" />);

    const revalidaBtn = screen.getByRole("button", { name: "Revalida" });
    const enamedBtn = screen.getByRole("button", { name: "ENAMED" });

    expect(revalidaBtn).toHaveAttribute("aria-pressed", "false");
    expect(enamedBtn).toHaveAttribute("aria-pressed", "true");
    expect(enamedBtn.className).toContain("bg-[#13A89E]");
  });

  it("calls switchExamAction and refreshes router when clicking the inactive exam", async () => {
    switchExamAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<ExamSwitcher currentExam="revalida" />);

    const enamedBtn = screen.getByRole("button", { name: "ENAMED" });
    await user.click(enamedBtn);

    expect(switchExamAction).toHaveBeenCalledWith("enamed");
  });

  it("does not call switchExamAction when clicking the currently active exam", async () => {
    const user = userEvent.setup();
    render(<ExamSwitcher currentExam="revalida" />);

    const revalidaBtn = screen.getByRole("button", { name: "Revalida" });
    await user.click(revalidaBtn);

    expect(switchExamAction).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
