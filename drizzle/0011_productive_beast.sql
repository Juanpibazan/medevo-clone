UPDATE "subscriptions" SET "status" = 'canceled' WHERE "status" = 'cancelled';--> statement-breakpoint
ALTER TABLE "billing_checkout_attempts" ADD CONSTRAINT "billing_checkout_attempts_provider_check" CHECK ("billing_checkout_attempts"."provider" in ('paddle', 'suby'));--> statement-breakpoint
ALTER TABLE "billing_checkout_attempts" ADD CONSTRAINT "billing_checkout_attempts_cycle_check" CHECK ("billing_checkout_attempts"."billing_cycle" in ('month', 'year'));--> statement-breakpoint
ALTER TABLE "billing_checkout_attempts" ADD CONSTRAINT "billing_checkout_attempts_status_check" CHECK ("billing_checkout_attempts"."status" in ('pending', 'created', 'failed', 'expired'));--> statement-breakpoint
ALTER TABLE "billing_provider_customers" ADD CONSTRAINT "billing_provider_customers_provider_check" CHECK ("billing_provider_customers"."provider" in ('paddle', 'suby'));--> statement-breakpoint
ALTER TABLE "billing_webhook_events" ADD CONSTRAINT "billing_webhook_events_provider_check" CHECK ("billing_webhook_events"."provider" in ('paddle', 'suby'));--> statement-breakpoint
ALTER TABLE "billing_webhook_events" ADD CONSTRAINT "billing_webhook_events_outcome_check" CHECK ("billing_webhook_events"."outcome" in ('processed', 'ignored'));--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_provider_check" CHECK ("subscriptions"."provider" in ('paddle', 'suby'));--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_status_check" CHECK ("subscriptions"."status" in ('active', 'trialing', 'past_due', 'paused', 'canceled', 'expired', 'incomplete'));
