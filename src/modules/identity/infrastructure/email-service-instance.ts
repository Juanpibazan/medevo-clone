import { ResendEmailService } from "../application/email-service";
import { env } from "@/lib/env";

export const emailService = new ResendEmailService(
  env.RESEND_API_KEY,
  env.RESEND_FROM_EMAIL,
);
