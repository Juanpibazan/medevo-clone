CREATE TABLE "paddle_webhook_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" text NOT NULL,
	"reason" text
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "paddle_subscription_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "paddle_customer_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "paddle_price_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "last_paddle_event_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_paddle_subscription_id_unique" UNIQUE("paddle_subscription_id");