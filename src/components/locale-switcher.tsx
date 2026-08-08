"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { SupportedLocale } from "@/modules/identity/client";

export function LocaleSwitcher() {
  const locale = useLocale() as SupportedLocale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("language");

  return (
    <select
      aria-label={t("label")}
      className="locale-select"
      name="locale"
      value={locale}
      onChange={(event) => {
        router.replace(pathname, {
          locale: event.currentTarget.value as SupportedLocale,
        });
      }}
    >
      <option value="pt-BR">{t("portuguese")}</option>
      <option value="es">{t("spanish")}</option>
    </select>
  );
}
