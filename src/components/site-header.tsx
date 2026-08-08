import { getTranslations } from "next-intl/server";
import { Brand } from "./brand";
import { LocaleSwitcher } from "./locale-switcher";
import { Link } from "@/i18n/navigation";
export async function SiteHeader() {
  const t = await getTranslations("nav");
  return (
    <header className="site-header">
      <Link href="/" aria-label={t("home")}>
        <Brand alt={t("logoAlt")} />
      </Link>
      <nav className="nav-actions" aria-label={t("label")}>
        <LocaleSwitcher />
        <Link className="text-link" href="/entrar">
          {t("signIn")}
        </Link>
        <Link className="text-link sign-up-link" href="/cadastro">
          {t("signUp")}
        </Link>
      </nav>
    </header>
  );
}
