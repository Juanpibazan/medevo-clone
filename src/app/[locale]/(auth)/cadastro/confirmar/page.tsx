import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { ConfirmarClient } from "./confirmar-client";

export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const t = await getTranslations("cadastroConfirmar");

  return (
    <main className="shell">
      <SiteHeader />
      <section className="auth-wrap mx-auto mt-6 flex max-w-md flex-col gap-6">
        <ConfirmarClient
          email={email || ""}
          eyebrow={t("eyebrow")}
          title={t("title")}
          intro={t("intro")}
          checkInbox={t("checkInbox")}
          resendBtn={t("resendBtn")}
          resending={t("resending")}
          resendSuccess={t("resendSuccess")}
          resendError={t("resendError") || "Error"}
          backToLogin={t("backToLogin")}
        />
      </section>
    </main>
  );
}
