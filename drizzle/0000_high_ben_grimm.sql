CREATE TABLE "actors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"preferred_username" text NOT NULL,
	"name" text NOT NULL,
	"summary" text,
	"inbox_url" text NOT NULL,
	"outbox_url" text NOT NULL,
	"followers_url" text NOT NULL,
	"following_url" text NOT NULL,
	"public_key_jwk" jsonb NOT NULL,
	"private_key_jwk" jsonb NOT NULL,
	"discoverable" boolean DEFAULT true NOT NULL,
	"indexable" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"activity_id" text NOT NULL,
	"object_id" text NOT NULL,
	"content" text NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "actors_identifier_unique" ON "actors" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "actors_preferred_username_idx" ON "actors" USING btree ("preferred_username");--> statement-breakpoint
CREATE UNIQUE INDEX "notes_activity_id_unique" ON "notes" USING btree ("activity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notes_object_id_unique" ON "notes" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "notes_actor_id_idx" ON "notes" USING btree ("actor_id");