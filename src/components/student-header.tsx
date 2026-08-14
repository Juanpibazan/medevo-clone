import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Brand } from "./brand";
import { LocaleSwitcher } from "./locale-switcher";
import { SignOutButton } from "./sign-out-button";
import { headers } from "next/headers";
import { auth, profileService } from "@/modules/identity";
import { DevRoleSwitcher } from "./dev-role-switcher";

export async function StudentHeader({
  showLocale = true,
}: {
  showLocale?: boolean;
}) {
  const t = await getTranslations("nav");

  const isDev = process.env.NODE_ENV === "development";
  let currentRole = "student";
  let showSwitcher = isDev;

  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    const rolesList = await profileService.getUserRoles(session.user.id);
    if (rolesList.length > 0) {
      currentRole = rolesList[0];
    }
    if (rolesList.includes("admin") || rolesList.includes("medical_editor")) {
      showSwitcher = true;
    }
  }

  return (
    <header className="site-header">
      <Link href="/app" aria-label={t("home")}>
        <Brand alt={t("logoAlt")} />
      </Link>
      <nav className="nav-actions" aria-label={t("studentLabel")}>
        {showSwitcher && <DevRoleSwitcher initialRole={currentRole} />}
        {showLocale && <LocaleSwitcher />}
        <SignOutButton compact />
      </nav>
    </header>
  );
}
