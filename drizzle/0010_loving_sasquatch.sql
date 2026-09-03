CREATE TABLE "billing_checkout_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"billing_cycle" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider_checkout_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_checkout_attempts_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "billing_provider_customers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_customer_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_webhook_events" (
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" text NOT NULL,
	"reason" text,
	CONSTRAINT "billing_webhook_events_provider_event_id_pk" PRIMARY KEY("provider","event_id")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "current_period_start" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "provider" text DEFAULT 'paddle' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "provider_subscription_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "provider_customer_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "provider_product_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "last_provider_event_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "cancels_at" timestamp with time zone;--> statement-breakpoint
UPDATE "subscriptions" SET
	"provider_subscription_id" = "paddle_subscription_id",
	"provider_customer_id" = "paddle_customer_id",
	"provider_product_id" = "paddle_price_id",
	"last_provider_event_at" = "last_paddle_event_at";--> statement-breakpoint
INSERT INTO "billing_provider_customers" ("id", "user_id", "provider", "provider_customer_id")
SELECT 'backfill:paddle:' || md5("user_id"), "user_id", 'paddle', "paddle_customer_id"
FROM (
	SELECT DISTINCT ON ("user_id") "user_id", "paddle_customer_id", "updated_at"
	FROM "subscriptions"
	WHERE "paddle_customer_id" IS NOT NULL
	ORDER BY "user_id", "updated_at" DESC
) AS "paddle_customers"
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "billing_checkout_attempts" ADD CONSTRAINT "billing_checkout_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_provider_customers" ADD CONSTRAINT "billing_provider_customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_checkout_attempts_user_idx" ON "billing_checkout_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_provider_customers_external_idx" ON "billing_provider_customers" USING btree ("provider","provider_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_provider_customers_user_idx" ON "billing_provider_customers" USING btree ("provider","user_id");--> statement-breakpoint
CREATE INDEX "billing_webhook_subscription_occurred_idx" ON "billing_webhook_events" USING btree ("provider","subscription_id","occurred_at");--> statement-breakpoint
INSERT INTO "billing_webhook_events" ("provider", "event_id", "subscription_id", "event_type", "occurred_at", "processed_at", "outcome", "reason")
SELECT 'paddle', "event_id", "subscription_id", "event_type", "occurred_at", "processed_at", "outcome", "reason"
FROM "paddle_webhook_events"
ON CONFLICT DO NOTHING;--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_provider_external_idx" ON "subscriptions" USING btree ("provider","provider_subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_status_idx" ON "subscriptions" USING btree ("user_id","status");
