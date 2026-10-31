ALTER TABLE "entries" ADD COLUMN "weekdays" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "class_time" text DEFAULT '' NOT NULL;