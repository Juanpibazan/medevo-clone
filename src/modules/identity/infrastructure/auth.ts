import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";
import { ensureStudentProvisioning } from "./provisioning";
import { profileService } from "./profile-service";
import { emailService } from "./email-service-instance";

export const auth = betterAuth({
  appName: "MedCiclo",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.BETTER_AUTH_URL],
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      const profile = await profileService.getProfile(user.id);
      const locale = profile?.locale ?? "pt-BR";
      await emailService.sendVerificationEmail({
        recipient: user.email,
        verificationUrl: url,
        locale,
      });
    },
  },
  advanced: { useSecureCookies: env.NODE_ENV === "production" },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await ensureStudentProvisioning(user.id);
        },
      },
    },
  },
});
