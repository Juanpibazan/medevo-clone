ALTER TABLE "profiles" DROP CONSTRAINT "profiles_exam_goal_revalida";--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "exam" text DEFAULT 'revalida' NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "exam_year" integer DEFAULT 2011 NOT NULL;--> statement-breakpoint
CREATE INDEX "questions_exam_idx" ON "questions" USING btree ("exam");--> statement-breakpoint
CREATE INDEX "questions_exam_year_idx" ON "questions" USING btree ("exam","exam_year");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_exam_goal_valid" CHECK ("profiles"."exam_goal" in ('revalida', 'enamed'));--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_exam_valid" CHECK ("questions"."exam" in ('revalida', 'enamed'));