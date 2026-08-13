"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/modules/identity";
import { billingService } from "@/modules/billing";

async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function upgradeToPremiumAction(locale: string) {
  const session = await requireAuth();
  await billingService.upgradeToPremium(session.user.id);
  redirect(`/${locale}/app/billing?success=true`);
}
