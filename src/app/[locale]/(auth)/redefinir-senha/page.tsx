import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { validateResetToken } from "./actions";
import { Link } from "@/i18n/navigation";

interface RedefinirSenhaPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function RedefinirSenhaPage({
  searchParams,
}: RedefinirSenhaPageProps) {
  const { token } = await searchParams;
  const t = await getTranslations("resetPassword");

  const isValidToken = token ? await validateResetToken(token) : false;

  return (
    <main className="shell">
      <SiteHeader />
      <section className="auth-wrap">
        <div className="card">
          <p className="eyebrow">{t("eyebrow")}</p>
          {isValidToken && token ? (
            <>
              <h1>{t("title")}</h1>
              <p className="card-intro">{t("intro")}</p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <div className="flex flex-col gap-4 text-center">
              <h1 className="text-xl font-bold text-[#102A43]">
                {t("invalidOrExpiredTokenTitle")}
              </h1>
              <p className="card-intro">
                {t("invalidOrExpiredTokenDescription")}
              </p>
              <Link href="/recuperar-senha" className="button">
                {t("requestNewLink")}
              </Link>
              <div className="form-links mt-2">
                <Link href="/entrar">{t("back")}</Link>
              </div>
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
