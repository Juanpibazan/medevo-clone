"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { SupportedLocale } from "@/modules/identity/client";
import { setLocalePreference } from "@/app/[locale]/locale-actions";

export function LocaleSwitcher() {
  const locale = useLocale() as SupportedLocale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("language");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="locale-control">
      <select
        aria-label={t("label")}
        aria-describedby={error ? "locale-error" : undefined}
        className="locale-select"
        disabled={pending}
        name="locale"
        value={locale}
        onChange={(event) => {
          const nextLocale = event.currentTarget.value as SupportedLocale;
          setError("");
          startTransition(async () => {
            const result = await setLocalePreference(nextLocale);
            if (!result.ok) {
              setError(t("error"));
              return;
            }
            router.replace(pathname, { locale: nextLocale });
            router.refresh();
          });
        }}
      >
        <option value="pt-BR">{t("portuguese")}</option>
        <option value="es">{t("spanish")}</option>
      </select>
      {error && (
        <span id="locale-error" className="locale-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
