"use server";
import { auth, recoverySchema } from "@/modules/identity";

export async function recoverPassword(
  input: unknown,
): Promise<{ accepted: boolean }> {
  const parsed = recoverySchema.safeParse(input);
  if (!parsed.success) return { accepted: false };

  try {
    await auth.api.requestPasswordReset({
      body: {
        email: parsed.data.email,
      },
    });
  } catch (error) {
    console.error("Error requesting password reset:", error);
  }

  return { accepted: true };
}
