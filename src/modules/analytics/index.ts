import { DrizzleAnalyticsRepository } from "./infrastructure/drizzle-analytics-repository";
import { AnalyticsService } from "./application/analytics-service";
import { contentService } from "@/modules/content";

export const analyticsService = new AnalyticsService(
  new DrizzleAnalyticsRepository(),
  contentService,
);

export { AnalyticsService } from "./application/analytics-service";
export type {
  AnalyticsRepository,
  UserMetrics,
} from "./application/analytics-service";
