import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { auth, type SupportedLocale } from "@/modules/identity";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect(`/${locale}/app`);
  }

  const t = await getTranslations("home");
  return (
    <main className="shell">
      <SiteHeader />
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p className="lede">{t("description")}</p>
          <Link className="button" href="/cadastro">
            {t("cta")}
          </Link>
        </div>
        <ol className="cycle" aria-label={t("cycleLabel")}>
          <li className="cycle-step">
            <b aria-hidden="true">01</b>
            {t("practice")}
          </li>
          <li className="cycle-step">
            <b aria-hidden="true">02</b>
            {t("error")}
          </li>
          <li className="cycle-step">
            <b aria-hidden="true">03</b>
            {t("review")}
          </li>
          <li className="cycle-step">
            <b aria-hidden="true">04</b>
            {t("progress")}
          </li>
        </ol>
      </section>
    </main>
  );
}
