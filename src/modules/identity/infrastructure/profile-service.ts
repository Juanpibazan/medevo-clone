import { ProfileService } from "../application/profile-service";
import { systemClock } from "../domain/onboarding";
import { DrizzleProfileRepository } from "./drizzle-profile-repository";
export const profileService = new ProfileService(
  new DrizzleProfileRepository(),
  systemClock,
);
