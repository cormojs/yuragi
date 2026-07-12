import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../../db/client";
import { actors, authSessions } from "../../db/schema";
import type { LocalActorRecord } from "./ActorStorage";

export class PostgresAuthStorage {
  async setPasswordHash(
    identifier: string,
    passwordHash: string,
  ): Promise<LocalActorRecord | undefined> {
    const [actor] = await db
      .update(actors)
      .set({ passwordHash, updatedAt: new Date() })
      .where(and(eq(actors.identifier, identifier), isNull(actors.passwordHash)))
      .returning();

    return actor;
  }

  findActorForLogin(identifier: string): Promise<LocalActorRecord | undefined> {
    return db.query.actors.findFirst({
      where: eq(actors.identifier, identifier),
    });
  }

  async updatePasswordHash(
    identifier: string,
    passwordHash: string,
  ): Promise<LocalActorRecord | undefined> {
    const [actor] = await db
      .update(actors)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(actors.identifier, identifier))
      .returning();

    return actor;
  }

  async deleteAccount(identifier: string): Promise<LocalActorRecord | undefined> {
    const [actor] = await db
      .delete(actors)
      .where(eq(actors.identifier, identifier))
      .returning();

    return actor;
  }

  async createSession({
    actorId,
    tokenHash,
    expiresAt,
  }: {
    actorId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await db.insert(authSessions).values({ actorId, tokenHash, expiresAt });
  }

  async findSessionActor(
    tokenHash: string,
  ): Promise<LocalActorRecord | undefined> {
    const row = await db
      .select({ actor: actors })
      .from(authSessions)
      .innerJoin(actors, eq(authSessions.actorId, actors.id))
      .where(
        and(
          eq(authSessions.tokenHash, tokenHash),
          gt(authSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return row[0]?.actor;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash));
  }
}

export const authStorage = new PostgresAuthStorage();
