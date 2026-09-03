import { getTranslations } from "next-intl/server";
import { Brand } from "./brand";
import { LocaleSwitcher } from "./locale-switcher";
import { SignOutButton } from "./sign-out-button";
import { Link } from "@/i18n/navigation";

export async function SiteHeader({
  isAuthenticated = false,
}: {
  isAuthenticated?: boolean;
}) {
  const t = await getTranslations("nav");
  return (
    <header
      className={
        isAuthenticated
          ? "site-header site-header-authenticated"
          : "site-header"
      }
    >
      <Link
        href={isAuthenticated ? "/app" : "/"}
        aria-label={
          isAuthenticated ? `${t("logoAlt")}: ${t("dashboard")}` : t("home")
        }
      >
        <Brand alt={t("logoAlt")} />
      </Link>
      <nav className="nav-actions" aria-label={t("label")}>
        <LocaleSwitcher />
        {isAuthenticated ? (
          <>
            <Link className="text-link" href="/app">
              {t("dashboard")}
            </Link>
            <SignOutButton compact />
          </>
        ) : (
          <>
            <Link className="text-link" href="/entrar">
              {t("signIn")}
            </Link>
            <Link className="text-link sign-up-link" href="/cadastro">
              {t("signUp")}
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
