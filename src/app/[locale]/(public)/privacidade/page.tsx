import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { auth, type SupportedLocale } from "@/modules/identity";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.privacy" });
  return {
    title: `${t("title")} — MedCiclo`,
    description: t("intro"),
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const t = await getTranslations({ locale, namespace: "legal.privacy" });

  const sectionIndices = Array.from({ length: 7 }, (_, i) => i);

  return (
    <div className="flex min-h-screen flex-col justify-between">
      <main className="shell py-6">
        <SiteHeader isAuthenticated={Boolean(session)} />
        <article className="mx-auto mt-10 max-w-3xl">
          <header className="mb-10 border-b border-[var(--line)] pb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--teal)]">
              {t("eyebrow")}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[var(--navy)] md:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {t("lastUpdated")}
            </p>
            <p className="mt-6 text-base leading-relaxed text-[var(--navy-2)]">
              {t("intro")}
            </p>
          </header>

          <div className="space-y-8 text-sm leading-relaxed text-[var(--navy-2)]">
            {sectionIndices.map((idx) => (
              <section
                key={idx}
                className="rounded-xl border border-[var(--line)] bg-[var(--white)] p-6 shadow-xs"
              >
                <h2 className="text-lg font-bold text-[var(--navy)]">
                  {t(`sections.${idx}.title`)}
                </h2>
                <p className="mt-3 leading-relaxed whitespace-pre-line text-[var(--navy-2)]">
                  {t(`sections.${idx}.content`)}
                </p>
              </section>
            ))}
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
