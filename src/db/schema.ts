import {
  AnyPgColumn,
  boolean,
  check,
  date,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
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

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // 'active' | 'cancelled' | 'expired'
  planCode: text("plan_code").notNull().default("premium"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

