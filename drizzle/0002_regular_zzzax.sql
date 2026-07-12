CREATE TABLE "followers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"follower_actor_uri" text NOT NULL,
	"follower_inbox_uri" text NOT NULL,
	"follower_shared_inbox_uri" text,
	"followed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "followers" ADD CONSTRAINT "followers_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "followers_actor_follower_unique" ON "followers" USING btree ("actor_id","follower_actor_uri");--> statement-breakpoint
CREATE INDEX "followers_actor_accepted_idx" ON "followers" USING btree ("actor_id","accepted_at");