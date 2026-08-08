import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";
import { ensureStudentProvisioning } from "./provisioning";
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
    requireEmailVerification: false,
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
