CREATE TABLE "editorial_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"question_version_id" text NOT NULL,
	"reviewer_id" text NOT NULL,
	"status" text NOT NULL,
	"comments" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "editorial_reviews" ADD CONSTRAINT "editorial_reviews_question_version_id_question_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "public"."question_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_reviews" ADD CONSTRAINT "editorial_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;