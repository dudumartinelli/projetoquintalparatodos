CREATE TABLE "festivals" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"banner_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "festival_id" integer;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_festival_id_festivals_id_fkey" FOREIGN KEY ("festival_id") REFERENCES "festivals"("id");