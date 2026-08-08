"use server";
import { recoverySchema, requestPasswordRecovery } from "@/modules/identity";
export async function recoverPassword(
  input: unknown,
): Promise<{ accepted: boolean }> {
  const parsed = recoverySchema.safeParse(input);
  if (!parsed.success) return { accepted: false };
  return requestPasswordRecovery();
}
