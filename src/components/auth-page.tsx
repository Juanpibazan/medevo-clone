import { getTranslations } from "next-intl/server";
import { SiteHeader } from "./site-header";
import { AuthForm } from "./auth-form";
export async function AuthPage({ mode }: { mode: "signIn" | "signUp" }) {
  const t = await getTranslations("auth");
  return (
    <main className="shell">
      <SiteHeader />
      <section className="auth-wrap">
        <div className="card">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t(mode === "signIn" ? "signInTitle" : "signUpTitle")}</h1>
          <p className="card-intro">
            {t(mode === "signIn" ? "signInIntro" : "signUpIntro")}
          </p>
          <AuthForm mode={mode} />
        </div>
      </section>
    </main>
  );
}
