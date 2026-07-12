import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "../../db/client";
import { actors, favourites, followers, notes } from "../../db/schema";

export type LocalActorRecord = typeof actors.$inferSelect;
export type LocalNoteRecord = typeof notes.$inferSelect;
export type LocalFollowerRecord = typeof followers.$inferSelect;
export type LocalFavouriteRecord = typeof favourites.$inferSelect;

export type CreateActorInput = typeof actors.$inferInsert;
export type CreateNoteInput = typeof notes.$inferInsert;
export type CreateFollowerInput = typeof followers.$inferInsert;
export type CreateFavouriteInput = typeof favourites.$inferInsert;
export type UpdateActorProfileInput = Partial<
  Pick<
    typeof actors.$inferInsert,
    "name" | "summary" | "discoverable" | "indexable"
  >
>;

export type ActorStorage = {
  createActor(input: CreateActorInput): Promise<LocalActorRecord>;
  createNote(input: CreateNoteInput): Promise<LocalNoteRecord>;
  createFollower(input: CreateFollowerInput): Promise<LocalFollowerRecord>;
  createFavourite(input: CreateFavouriteInput): Promise<LocalFavouriteRecord>;
  updateActorProfile(
    id: string,
    input: UpdateActorProfileInput,
  ): Promise<LocalActorRecord | undefined>;
  markFollowerAccepted(id: string): Promise<LocalFollowerRecord | undefined>;
  findActorByIdentifier(
    identifier: string,
  ): Promise<LocalActorRecord | undefined>;
  findActorById(id: string): Promise<LocalActorRecord | undefined>;
  findNoteByObjectId(objectId: string): Promise<LocalNoteRecord | undefined>;
  findNoteByActivityId(activityId: string): Promise<LocalNoteRecord | undefined>;
  findNoteById(id: string): Promise<LocalNoteRecord | undefined>;
  findFavouriteByNoteAndActor(
    noteId: string,
    actorUri: string,
  ): Promise<LocalFavouriteRecord | undefined>;
  findFavouriteByActivityId(
    activityId: string,
  ): Promise<LocalFavouriteRecord | undefined>;
  countFavouritesForNote(noteId: string): Promise<number>;
  deleteFavourite(id: string): Promise<void>;
  listNotesForActor(actorId: string): Promise<LocalNoteRecord[]>;
  listAcceptedFollowersForActor(actorId: string): Promise<LocalFollowerRecord[]>;
  listPublicLocalNotes(): Promise<
    { actor: LocalActorRecord; note: LocalNoteRecord }[]
  >;
};

export class PostgresActorStorage implements ActorStorage {
  async createActor(input: CreateActorInput): Promise<LocalActorRecord> {
    const [created] = await db
      .insert(actors)
      .values(input)
      .onConflictDoNothing({ target: actors.identifier })
      .returning();
    if (created != null) return created;

    const existing = await this.findActorByIdentifier(input.identifier);
    if (existing != null) return existing;

    throw new Error("Failed to create or retrieve local actor.");
  }

  async createNote(input: CreateNoteInput): Promise<LocalNoteRecord> {
    const [created] = await db
      .insert(notes)
      .values(input)
      .onConflictDoNothing({ target: notes.objectId })
      .returning();
    if (created != null) return created;

    const existing = await this.findNoteByObjectId(input.objectId);
    if (existing != null) return existing;

    throw new Error("Failed to create or retrieve local note.");
  }

  async createFollower(
    input: CreateFollowerInput,
  ): Promise<LocalFollowerRecord> {
    const [created] = await db
      .insert(followers)
      .values(input)
      .onConflictDoNothing({
        target: [followers.actorId, followers.followerActorUri],
      })
      .returning();
    if (created != null) return created;

    const existing = await db.query.followers.findFirst({
      where: and(
        eq(followers.actorId, input.actorId),
        eq(followers.followerActorUri, input.followerActorUri),
      ),
    });
    if (existing != null) return existing;

    throw new Error("Failed to create or retrieve follower.");
  }

  async createFavourite(
    input: CreateFavouriteInput,
  ): Promise<LocalFavouriteRecord> {
    const [created] = await db
      .insert(favourites)
      .values(input)
      .onConflictDoNothing({ target: [favourites.noteId, favourites.actorUri] })
      .returning();
    if (created != null) return created;

    const existing = await this.findFavouriteByNoteAndActor(
      input.noteId,
      input.actorUri,
    );
    if (existing != null) return existing;

    throw new Error("Failed to create or retrieve favourite.");
  }

  async updateActorProfile(
    id: string,
    input: UpdateActorProfileInput,
  ): Promise<LocalActorRecord | undefined> {
    const [actor] = await db
      .update(actors)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(actors.id, id))
      .returning();
    return actor;
  }

  async markFollowerAccepted(
    id: string,
  ): Promise<LocalFollowerRecord | undefined> {
    const [follower] = await db
      .update(followers)
      .set({ acceptedAt: new Date() })
      .where(eq(followers.id, id))
      .returning();

    return follower;
  }

  findActorByIdentifier(
    identifier: string,
  ): Promise<LocalActorRecord | undefined> {
    return db.query.actors.findFirst({
      where: eq(actors.identifier, identifier),
    });
  }

  findActorById(id: string): Promise<LocalActorRecord | undefined> {
    return db.query.actors.findFirst({
      where: eq(actors.id, id),
    });
  }

  findNoteByObjectId(objectId: string): Promise<LocalNoteRecord | undefined> {
    return db.query.notes.findFirst({
      where: eq(notes.objectId, objectId),
    });
  }

  findNoteByActivityId(
    activityId: string,
  ): Promise<LocalNoteRecord | undefined> {
    return db.query.notes.findFirst({ where: eq(notes.activityId, activityId) });
  }

  findNoteById(id: string): Promise<LocalNoteRecord | undefined> {
    return db.query.notes.findFirst({ where: eq(notes.id, id) });
  }

  findFavouriteByNoteAndActor(
    noteId: string,
    actorUri: string,
  ): Promise<LocalFavouriteRecord | undefined> {
    return db.query.favourites.findFirst({
      where: and(
        eq(favourites.noteId, noteId),
        eq(favourites.actorUri, actorUri),
      ),
    });
  }

  findFavouriteByActivityId(
    activityId: string,
  ): Promise<LocalFavouriteRecord | undefined> {
    return db.query.favourites.findFirst({
      where: eq(favourites.activityId, activityId),
    });
  }

  async countFavouritesForNote(noteId: string): Promise<number> {
    const [result] = await db
      .select({ value: count() })
      .from(favourites)
      .where(eq(favourites.noteId, noteId));
    return result?.value ?? 0;
  }

  async deleteFavourite(id: string): Promise<void> {
    await db.delete(favourites).where(eq(favourites.id, id));
  }

  listNotesForActor(actorId: string): Promise<LocalNoteRecord[]> {
    return db.query.notes.findMany({
      where: eq(notes.actorId, actorId),
      orderBy: desc(notes.publishedAt),
    });
  }

  listAcceptedFollowersForActor(
    actorId: string,
  ): Promise<LocalFollowerRecord[]> {
    return db.query.followers.findMany({
      where: and(eq(followers.actorId, actorId), isNotNull(followers.acceptedAt)),
      orderBy: desc(followers.followedAt),
    });
  }

  async listPublicLocalNotes(): Promise<
    { actor: LocalActorRecord; note: LocalNoteRecord }[]
  > {
    const rows = await db
      .select({ actor: actors, note: notes })
      .from(notes)
      .innerJoin(actors, eq(notes.actorId, actors.id))
      .where(and(eq(actors.discoverable, true), eq(actors.indexable, true)))
      .orderBy(desc(notes.publishedAt));

    return rows.map((row) => ({ actor: row.actor, note: row.note }));
  }
}

export const actorStorage = new PostgresActorStorage();
