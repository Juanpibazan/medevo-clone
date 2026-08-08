import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "@/components/auth-form";

const { push, refresh, signIn } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "es",
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/modules/identity/client", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/identity/client")
  >("@/modules/identity/client");
  return {
    ...actual,
    authClient: {
      signIn: { email: signIn },
      signUp: { email: vi.fn() },
    },
  };
});

describe("AuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn.mockResolvedValue({ data: {}, error: null });
  });

  it("labels credential fields and submits a valid login", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="signIn" />);

    const email = screen.getByLabelText("email");
    const password = screen.getByLabelText("password");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(password).toHaveAttribute("autocomplete", "current-password");

    await user.type(email, "student@example.test");
    await user.type(password, "a-secure-password");
    await user.click(screen.getByRole("button", { name: "enter" }));

    expect(signIn).toHaveBeenCalledWith({
      email: "student@example.test",
      password: "a-secure-password",
    });
    expect(push).toHaveBeenCalledWith("/es/app");
  });
});
