CREATE TYPE "public"."question_type" AS ENUM('multiple_choice', 'open_ended');--> statement-breakpoint
CREATE TABLE "question_images" (
	"id" text PRIMARY KEY NOT NULL,
	"question_version_id" text NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "question_versions" ADD COLUMN "type" "question_type" DEFAULT 'multiple_choice' NOT NULL;--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "response_text" text;--> statement-breakpoint
ALTER TABLE "question_images" ADD CONSTRAINT "question_images_question_version_id_question_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "public"."question_versions"("id") ON DELETE cascade ON UPDATE no action;