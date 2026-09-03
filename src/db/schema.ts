import {
  AnyPgColumn,
  boolean,
  check,
  date,
  integer,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const localeEnum = pgEnum("locale", ["pt-BR", "es"]);
export const onboardingStatusEnum = pgEnum("onboarding_status", [
  "not_started",
  "in_progress",
  "completed",
]);
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});
export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    locale: localeEnum("locale").notNull().default("pt-BR"),
    examGoal: text("exam_goal").notNull().default("revalida"),
    tentativeExamDate: date("tentative_exam_date"),
    weeklyStudyMinutes: integer("weekly_study_minutes"),
    onboardingStatus: onboardingStatusEnum("onboarding_status")
      .notNull()
      .default("not_started"),
    onboardingCompletedStep: smallint("onboarding_completed_step")
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("profiles_exam_goal_revalida", sql`${table.examGoal} = 'revalida'`),
    check(
      "profiles_onboarding_completed_step_range",
      sql`${table.onboardingCompletedStep} between 0 and 3`,
    ),
    check(
      "profiles_weekly_minutes_valid",
      sql`${table.weeklyStudyMinutes} is null or (${table.weeklyStudyMinutes} between 60 and 2400 and ${table.weeklyStudyMinutes} % 30 = 0)`,
    ),
    check(
      "profiles_onboarding_state_consistent",
      sql`(${table.onboardingStatus} = 'not_started' and ${table.onboardingCompletedStep} = 0) or (${table.onboardingStatus} = 'in_progress' and ${table.onboardingCompletedStep} in (1, 2)) or (${table.onboardingStatus} = 'completed' and ${table.onboardingCompletedStep} = 3)`,
    ),
    check(
      "profiles_completed_requires_minutes",
      sql`${table.onboardingStatus} <> 'completed' or ${table.weeklyStudyMinutes} is not null`,
    ),
  ],
);
export const roles = pgTable("roles", {
  code: text("code").primaryKey(),
  description: text("description").notNull(),
});
export const userRoles = pgTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleCode: text("role_code")
      .notNull()
      .references(() => roles.code, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleCode] })],
);
export const consents = pgTable(
  "consents",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    version: text("version").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("consents_user_kind_version_idx").on(
      table.userId,
      table.kind,
      table.version,
    ),
  ],
);

export const taxonomyLevelEnum = pgEnum("taxonomy_level", [
  "specialty",
  "theme",
  "focus",
  "subfocus",
]);

export const questionStatusEnum = pgEnum("question_status", [
  "draft",
  "in_review",
  "published",
  "annulled",
]);

export const questionTypeEnum = pgEnum("question_type", [
  "multiple_choice",
  "open_ended",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "in_progress",
  "completed",
]);

export const metacognitiveMarkEnum = pgEnum("metacognitive_mark", [
  "domine",
  "duda",
  "vacile",
  "no_sabia",
]);

export const taxonomyNodes = pgTable("taxonomy_nodes", {
  id: text("id").primaryKey(),
  parentId: text("parent_id").references((): AnyPgColumn => taxonomyNodes.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  level: taxonomyLevelEnum("level").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  publishedVersionId: text("published_version_id").references(
    (): AnyPgColumn => questionVersions.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const questionVersions = pgTable("question_versions", {
  id: text("id").primaryKey(),
  questionId: text("question_id")
    .notNull()
    .references((): AnyPgColumn => questions.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  status: questionStatusEnum("status").notNull().default("draft"),
  title: text("title").notNull(),
  statement: text("statement").notNull(),
  explanation: text("explanation").notNull(),
  taxonomyNodeId: text("taxonomy_node_id")
    .notNull()
    .references(() => taxonomyNodes.id, { onDelete: "restrict" }),
  type: questionTypeEnum("type").notNull().default("multiple_choice"),
  subquestions:
    jsonb("subquestions").$type<
      { letter: string; statement: string; explanation: string }[]
    >(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const questionAlternatives = pgTable("question_alternatives", {
  id: text("id").primaryKey(),
  questionVersionId: text("question_version_id")
    .notNull()
    .references(() => questionVersions.id, { onDelete: "cascade" }),
  optionLetter: text("option_letter").notNull(),
  text: text("text").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const studySessions = pgTable("study_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: sessionStatusEnum("status").notNull().default("in_progress"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const studySessionItems = pgTable("study_session_items", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => studySessions.id, { onDelete: "cascade" }),
  questionVersionId: text("question_version_id")
    .notNull()
    .references(() => questionVersions.id, { onDelete: "restrict" }),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const responses = pgTable("responses", {
  id: text("id").primaryKey(),
  sessionItemId: text("session_item_id")
    .notNull()
    .unique()
    .references(() => studySessionItems.id, { onDelete: "cascade" }),
  selectedAlternativeId: text("selected_alternative_id").references(
    () => questionAlternatives.id,
    { onDelete: "set null" },
  ),
  responseText: text("response_text"),
  isCorrect: boolean("is_correct"),
  timeTakenSeconds: integer("time_taken_seconds").notNull().default(0),
  metacognitiveMark: metacognitiveMarkEnum("metacognitive_mark"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const reviewQueue = pgTable("review_queue", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  questionId: text("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  stability: real("stability").notNull(),
  difficulty: real("difficulty").notNull(),
  elapsedDays: integer("elapsed_days").notNull(),
  scheduledDays: integer("scheduled_days").notNull(),
  repetition: integer("repetition").notNull(),
  state: integer("state").notNull(),
  lastReviewAt: timestamp("last_review_at", { withTimezone: true }),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // 'active' | 'cancelled' | 'expired'
    planCode: text("plan_code").notNull().default("premium"),
    provider: text("provider", { enum: ["paddle", "suby"] })
      .notNull()
      .default("paddle"),
    providerSubscriptionId: text("provider_subscription_id"),
    providerCustomerId: text("provider_customer_id"),
    providerProductId: text("provider_product_id"),
    lastProviderEventAt: timestamp("last_provider_event_at", {
      withTimezone: true,
    }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    cancelsAt: timestamp("cancels_at", { withTimezone: true }),
    paddleSubscriptionId: text("paddle_subscription_id").unique(),
    paddleCustomerId: text("paddle_customer_id"),
    paddlePriceId: text("paddle_price_id"),
    lastPaddleEventAt: timestamp("last_paddle_event_at", {
      withTimezone: true,
    }),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "subscriptions_provider_check",
      sql`${table.provider} in ('paddle', 'suby')`,
    ),
    check(
      "subscriptions_status_check",
      sql`${table.status} in ('active', 'trialing', 'past_due', 'paused', 'canceled', 'expired', 'incomplete')`,
    ),
    uniqueIndex("subscriptions_provider_external_idx").on(
      table.provider,
      table.providerSubscriptionId,
    ),
    index("subscriptions_user_status_idx").on(table.userId, table.status),
  ],
);

export const billingProviderCustomers = pgTable(
  "billing_provider_customers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["paddle", "suby"] }).notNull(),
    providerCustomerId: text("provider_customer_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "billing_provider_customers_provider_check",
      sql`${table.provider} in ('paddle', 'suby')`,
    ),
    uniqueIndex("billing_provider_customers_external_idx").on(
      table.provider,
      table.providerCustomerId,
    ),
    uniqueIndex("billing_provider_customers_user_idx").on(
      table.provider,
      table.userId,
    ),
  ],
);

export const billingCheckoutAttempts = pgTable(
  "billing_checkout_attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["paddle", "suby"] }).notNull(),
    billingCycle: text("billing_cycle", { enum: ["month", "year"] }).notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    providerCheckoutId: text("provider_checkout_id"),
    status: text("status", {
      enum: ["pending", "created", "failed", "expired"],
    })
      .notNull()
      .default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "billing_checkout_attempts_provider_check",
      sql`${table.provider} in ('paddle', 'suby')`,
    ),
    check(
      "billing_checkout_attempts_cycle_check",
      sql`${table.billingCycle} in ('month', 'year')`,
    ),
    check(
      "billing_checkout_attempts_status_check",
      sql`${table.status} in ('pending', 'created', 'failed', 'expired')`,
    ),
    index("billing_checkout_attempts_user_idx").on(table.userId),
  ],
);

export const billingWebhookEvents = pgTable(
  "billing_webhook_events",
  {
    provider: text("provider", { enum: ["paddle", "suby"] }).notNull(),
    eventId: text("event_id").notNull(),
    subscriptionId: text("subscription_id").notNull(),
    eventType: text("event_type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    outcome: text("outcome", { enum: ["processed", "ignored"] }).notNull(),
    reason: text("reason"),
  },
  (table) => [
    check(
      "billing_webhook_events_provider_check",
      sql`${table.provider} in ('paddle', 'suby')`,
    ),
    check(
      "billing_webhook_events_outcome_check",
      sql`${table.outcome} in ('processed', 'ignored')`,
    ),
    primaryKey({ columns: [table.provider, table.eventId] }),
    index("billing_webhook_subscription_occurred_idx").on(
      table.provider,
      table.subscriptionId,
      table.occurredAt,
    ),
  ],
);

export const paddleWebhookEvents = pgTable(
  "paddle_webhook_events",
  {
    eventId: text("event_id").primaryKey(),
    subscriptionId: text("subscription_id").notNull(),
    eventType: text("event_type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    outcome: text("outcome", { enum: ["processed", "ignored"] }).notNull(),
    reason: text("reason"),
  },
  (table) => [
    index("paddle_webhook_subscription_occurred_idx").on(
      table.subscriptionId,
      table.occurredAt,
    ),
  ],
);

export const editorialReviews = pgTable("editorial_reviews", {
  id: text("id").primaryKey(),
  questionVersionId: text("question_version_id")
    .notNull()
    .references(() => questionVersions.id, { onDelete: "cascade" }),
  reviewerId: text("reviewer_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  status: text("status", {
    enum: ["approved", "changes_requested", "annulled"],
  }).notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const analyticsEvents = pgTable("analytics_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  properties: jsonb("properties")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const questionImages = pgTable("question_images", {
  id: text("id").primaryKey(),
  questionVersionId: text("question_version_id")
    .notNull()
    .references(() => questionVersions.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
