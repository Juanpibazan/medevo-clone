import { defineRouting } from "next-intl/routing";
export const LOCALE_COOKIE_NAME = "MEDCICLO_LOCALE";
export const routing = defineRouting({
  locales: ["pt-BR", "es"],
  defaultLocale: "pt-BR",
  localePrefix: "always",
  localeCookie: { name: LOCALE_COOKIE_NAME },
});
