import type { AnchorHTMLAttributes, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/site-header";

const translations: Record<string, string> = {
  home: "Ir al inicio",
  logoAlt: "MedCiclo",
  label: "Navegación principal",
  dashboard: "Ir al panel",
  signIn: "Ingresar",
  signUp: "Crear cuenta",
};

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => translations[key] ?? key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/locale-switcher", () => ({
  LocaleSwitcher: () => <span>Locale</span>,
}));

vi.mock("@/components/brand", () => ({
  Brand: ({ alt }: { alt: string }) => <span>{alt}</span>,
}));

vi.mock("@/components/sign-out-button", () => ({
  SignOutButton: ({ compact }: { compact?: boolean }) => (
    <button type="button" data-compact={compact}>
      Cerrar sesión
    </button>
  ),
}));

describe("SiteHeader", () => {
  it("keeps the guest authentication actions", async () => {
    render(await SiteHeader({}));

    expect(screen.getByText("Locale")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ingresar" })).toHaveAttribute(
      "href",
      "/entrar",
    );
    expect(screen.getByRole("link", { name: "Crear cuenta" })).toHaveAttribute(
      "href",
      "/cadastro",
    );
    expect(screen.queryByRole("link", { name: "Ir al panel" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
  });

  it("shows dashboard and sign-out actions to authenticated users", async () => {
    render(await SiteHeader({ isAuthenticated: true }));

    expect(screen.getByRole("banner")).toHaveClass(
      "site-header",
      "site-header-authenticated",
    );
    expect(screen.getByText("Locale")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al panel" })).toHaveAttribute(
      "href",
      "/app",
    );
    expect(
      screen.getByRole("link", { name: "MedCiclo: Ir al panel" }),
    ).toHaveAttribute("href", "/app");
    expect(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    ).toHaveAttribute("data-compact", "true");
    expect(screen.queryByRole("link", { name: "Ingresar" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Crear cuenta" })).toBeNull();
  });
});
