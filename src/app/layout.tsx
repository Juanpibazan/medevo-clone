import type { ReactNode } from "react";
import { headers } from "next/headers";
import "@fontsource-variable/manrope";
import "./globals.css";
export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = (await headers()).get("x-next-intl-locale") ?? "pt-BR";
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
