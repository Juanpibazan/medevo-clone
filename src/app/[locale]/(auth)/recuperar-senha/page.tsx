import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { RecoveryForm } from "@/components/recovery-form";
export default async function RecoveryPage() {
  const t = await getTranslations("recovery");
  return (
    <main className="shell">
      <SiteHeader />
      <section className="auth-wrap">
        <div className="card">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p className="card-intro">{t("intro")}</p>
          <RecoveryForm />
        </div>
      </section>
    </main>
  );
}
