ALTER TABLE "questions" ADD COLUMN "institution" text DEFAULT 'INEP' NOT NULL;--> statement-breakpoint
CREATE INDEX "questions_institution_idx" ON "questions" USING btree ("institution");