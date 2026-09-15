"use server";

import { auth, resetPasswordSchema } from "@/modules/identity";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

export async function validateResetToken(token: string): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  try {
    const rows = await db
      .select({ id: schema.verifications.id })
      .from(schema.verifications)
      .where(
        and(
          eq(schema.verifications.identifier, `reset-password:${token}`),
          gt(schema.verifications.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    console.error("Failed to validate reset token:", error);
    return false;
  }
}

export async function submitResetPassword(input: unknown): Promise<{
  success: boolean;
  error?:
    | "INVALID_INPUT"
    | "PASSWORDS_DONT_MATCH"
    | "PASSWORD_TOO_SHORT"
    | "INVALID_TOKEN";
}> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const hasMismatch = parsed.error.issues.some((issue) =>
      issue.path.includes("confirmPassword"),
    );
    const hasShort = parsed.error.issues.some(
      (issue) => issue.code === "too_small",
    );
    if (hasMismatch) return { success: false, error: "PASSWORDS_DONT_MATCH" };
    if (hasShort) return { success: false, error: "PASSWORD_TOO_SHORT" };
    return { success: false, error: "INVALID_INPUT" };
  }

  try {
    await auth.api.resetPassword({
      body: {
        token: parsed.data.token,
        newPassword: parsed.data.password,
      },
    });
    return { success: true };
  } catch (err: unknown) {
    console.error("Reset password error:", err);
    return { success: false, error: "INVALID_TOKEN" };
  }
}
