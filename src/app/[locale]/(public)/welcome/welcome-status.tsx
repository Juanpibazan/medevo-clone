"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
export function WelcomeStatus({
  active,
  locale,
}: {
  active: boolean;
  locale: "pt-BR" | "es";
}) {
  const t = useTranslations("welcome");
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (active) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - started >= 30_000) {
        window.clearInterval(timer);
        setTimedOut(true);
      } else router.refresh();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [active, attempt, router]);
  if (active)
    return (
      <>
        <h1>{t("activeTitle")}</h1>
        <p>{t("activeBody")}</p>
        <a className="button" href={`/${locale}/app`}>
          {t("goToApp")}
        </a>
      </>
    );
  return (
    <>
      <h1>{timedOut ? t("timeoutTitle") : t("pendingTitle")}</h1>
      <p>{timedOut ? t("timeoutBody") : t("pendingBody")}</p>
      {timedOut && (
        <button
          className="button"
          type="button"
          onClick={() => {
            setTimedOut(false);
            setAttempt((current) => current + 1);
            router.refresh();
          }}
        >
          {t("retry")}
        </button>
      )}
    </>
  );
}
