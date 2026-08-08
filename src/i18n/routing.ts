import { defineRouting } from "next-intl/routing";
export const routing = defineRouting({
  locales: ["pt-BR", "es"],
  defaultLocale: "pt-BR",
  localePrefix: "always",
  localeCookie: { name: "MEDCICLO_LOCALE" },
});
