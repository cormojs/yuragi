import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { actors, notes } from "../../db/schema";

export type LocalActorRecord = typeof actors.$inferSelect;
export type LocalNoteRecord = typeof notes.$inferSelect;

export type CreateActorInput = typeof actors.$inferInsert;
export type CreateNoteInput = typeof notes.$inferInsert;

export type ActorStorage = {
  createActor(input: CreateActorInput): Promise<LocalActorRecord>;
  createNote(input: CreateNoteInput): Promise<LocalNoteRecord>;
  findActorByIdentifier(
    identifier: string,
  ): Promise<LocalActorRecord | undefined>;
  findActorById(id: string): Promise<LocalActorRecord | undefined>;
  findNoteByObjectId(objectId: string): Promise<LocalNoteRecord | undefined>;
  listNotesForActor(actorId: string): Promise<LocalNoteRecord[]>;
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

  listNotesForActor(actorId: string): Promise<LocalNoteRecord[]> {
    return db.query.notes.findMany({
      where: eq(notes.actorId, actorId),
      orderBy: desc(notes.publishedAt),
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
