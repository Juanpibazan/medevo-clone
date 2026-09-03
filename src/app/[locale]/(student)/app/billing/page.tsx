import { redirect } from "next/navigation";
import type { SupportedLocale } from "@/modules/identity";
export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/pricing`);
}
