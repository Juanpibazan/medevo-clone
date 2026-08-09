import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleSwitcher } from "@/components/locale-switcher";
const { replace, refresh, setPreference } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  setPreference: vi.fn(),
}));
vi.mock("next-intl", () => ({
  useLocale: () => "es",
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/entrar",
  useRouter: () => ({ replace, refresh }),
}));
vi.mock("@/app/[locale]/locale-actions", () => ({
  setLocalePreference: setPreference,
}));
describe("LocaleSwitcher", () => {
  beforeEach(() => vi.clearAllMocks());
  it("preserves the URL when persistence fails and exposes an error", async () => {
    setPreference.mockResolvedValue({ ok: false, error: "save_failed" });
    const user = userEvent.setup();
    render(<LocaleSwitcher />);
    await user.selectOptions(screen.getByRole("combobox"), "pt-BR");
    expect(await screen.findByRole("alert")).toHaveTextContent("error");
    expect(replace).not.toHaveBeenCalled();
  });
  it("navigates only after the preference is saved", async () => {
    setPreference.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<LocaleSwitcher />);
    await user.selectOptions(screen.getByRole("combobox"), "pt-BR");
    expect(replace).toHaveBeenCalledWith("/entrar", { locale: "pt-BR" });
    expect(refresh).toHaveBeenCalled();
  });
});
