import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type SupportedLocale } from "@/modules/identity";
import { billingService } from "@/modules/billing";
import { SiteHeader } from "@/components/site-header";
import { WelcomeStatus } from "./welcome-status";
export default async function WelcomePage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    redirect(
      `/${locale}/entrar?callbackUrl=${encodeURIComponent(`/${locale}/welcome`)}`,
    );
  const active = Boolean(
    await billingService.getActiveSubscription(session.user.id),
  );
  return (
    <main className="shell">
      <SiteHeader isAuthenticated />
      <section className="auth-wrap">
        <div className="card welcome-card">
          <WelcomeStatus active={active} locale={locale} />
        </div>
      </section>
    </main>
  );
}
