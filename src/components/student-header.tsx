import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Brand } from "./brand";
import { LocaleSwitcher } from "./locale-switcher";
import { SignOutButton } from "./sign-out-button";
export async function StudentHeader({
  showLocale = true,
}: {
  showLocale?: boolean;
}) {
  const t = await getTranslations("nav");
  return (
    <header className="site-header">
      <Link href="/" aria-label={t("home")}>
        <Brand alt={t("logoAlt")} />
      </Link>
      <nav className="nav-actions" aria-label={t("studentLabel")}>
        {showLocale && <LocaleSwitcher />}
        <SignOutButton compact />
      </nav>
    </header>
  );
}
