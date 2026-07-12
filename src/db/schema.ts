import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const actors = pgTable(
  "actors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    preferredUsername: text("preferred_username").notNull(),
    name: text("name").notNull(),
    summary: text("summary"),
    inboxUrl: text("inbox_url").notNull(),
    outboxUrl: text("outbox_url").notNull(),
    followersUrl: text("followers_url").notNull(),
    followingUrl: text("following_url").notNull(),
    publicKeyJwk: jsonb("public_key_jwk").notNull(),
    privateKeyJwk: jsonb("private_key_jwk").notNull(),
    passwordHash: text("password_hash"),
    discoverable: boolean("discoverable").notNull().default(true),
    indexable: boolean("indexable").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("actors_identifier_unique").on(table.identifier),
    index("actors_preferred_username_idx").on(table.preferredUsername),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => actors.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_hash_unique").on(table.tokenHash),
    index("auth_sessions_actor_id_idx").on(table.actorId),
  ],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => actors.id, { onDelete: "cascade" }),
    activityId: text("activity_id").notNull(),
    objectId: text("object_id").notNull(),
    content: text("content").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("notes_activity_id_unique").on(table.activityId),
    uniqueIndex("notes_object_id_unique").on(table.objectId),
    index("notes_actor_id_idx").on(table.actorId),
  ],
);
