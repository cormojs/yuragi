CREATE TABLE "favourites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL,
	"actor_uri" text NOT NULL,
	"activity_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "favourites_note_actor_unique" ON "favourites" USING btree ("note_id","actor_uri");--> statement-breakpoint
CREATE UNIQUE INDEX "favourites_activity_id_unique" ON "favourites" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "favourites_note_id_idx" ON "favourites" USING btree ("note_id");