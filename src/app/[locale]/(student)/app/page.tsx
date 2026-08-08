import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  auth,
  ensureStudentProvisioning,
  type SupportedLocale,
} from "@/modules/identity";
import { SiteHeader } from "@/components/site-header";
import { SignOutButton } from "@/components/sign-out-button";
export default async function AppPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    redirect(
      `/${locale}/entrar?callbackUrl=${encodeURIComponent(`/${locale}/app`)}`,
    );
  await ensureStudentProvisioning(session.user.id, locale);
  const t = await getTranslations("app");
  return (
    <main className="shell">
      <SiteHeader />
      <section className="auth-wrap">
        <div className="card app-panel">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("title", { name: session.user.name })}</h1>
          <p className="card-intro">{t("intro")}</p>
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
