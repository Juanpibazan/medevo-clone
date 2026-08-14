import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  RESEND_API_KEY: z.string().startsWith("re_"),
  RESEND_FROM_EMAIL: z.string().email().default("onboarding@resend.dev"),
});

const testDefaults =
  process.env.NODE_ENV === "test"
    ? {
        DATABASE_URL:
          "postgresql://postgres:postgres@127.0.0.1:5432/medciclo_test",
        BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
        BETTER_AUTH_URL: "http://localhost:3000",
        RESEND_API_KEY:
          process.env.RESEND_API_KEY || "re_dummykeyfortestpurposesonly",
        RESEND_FROM_EMAIL:
          process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      }
    : {};

export const env = schema.parse({ ...testDefaults, ...process.env });
