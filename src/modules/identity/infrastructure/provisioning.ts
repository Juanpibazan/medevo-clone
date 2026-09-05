import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { consents, profiles, roles, userRoles } from "@/db/schema";
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
    await tx.insert(profiles).values({ userId, locale }).onConflictDoNothing();
    await tx
      .insert(userRoles)
      .values({ userId, roleCode: "student" })
      .onConflictDoNothing();
    await tx
      .insert(consents)
      .values({
        id: randomUUID(),
        userId,
        kind: "terms_and_privacy",
        version: "2026.1",
      })
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
