import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles, roles, userRoles } from "@/db/schema";
import type { SupportedLocale } from "../domain/identity";
export async function ensureStudentProvisioning(
  userId: string,
  locale: SupportedLocale = "pt-BR",
) {
  return db.transaction(async (tx) => {
    await tx
      .insert(roles)
      .values({ code: "student", description: "Student" })
      .onConflictDoNothing();
    await tx
      .insert(profiles)
      .values({ userId, locale })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { locale, updatedAt: new Date() },
      });
    await tx
      .insert(userRoles)
      .values({ userId, roleCode: "student" })
      .onConflictDoNothing();
    const [assignment] = await tx
      .select()
      .from(userRoles)
      .where(
        and(eq(userRoles.userId, userId), eq(userRoles.roleCode, "student")),
      )
      .limit(1);
    return assignment;
  });
}
