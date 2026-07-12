import {
  createFederation,
  createInboxContext,
  createRequestContext,
} from "@fedify/testing";
import {
  Accept,
  Create,
  type Activity,
  Follow,
  Like,
  Person,
  Undo,
} from "@fedify/vocab";
import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { createFederationMiddleware } from "../controller/FederationController";
import type {
  ActorStorage,
  CreateActorInput,
  CreateFollowerInput,
  CreateFavouriteInput,
  CreateNoteInput,
  LocalActorRecord,
  LocalFollowerRecord,
  LocalFavouriteRecord,
  LocalNoteRecord,
  UpdateActorProfileInput,
} from "../infra/ActorStorage";
import { ActorService } from "./actorService";
import {
  FederationService,
  type FederationContextData,
} from "./FederationService";

const origin = "https://yuragi.example";
const localActor: LocalActorRecord = {
  id: "c84ee0e4-c2f2-47c2-b50a-72f874994e5d",
  identifier: "alice",
  preferredUsername: "alice",
  name: "Alice",
  summary: null,
  inboxUrl: `${origin}/users/alice/inbox`,
  outboxUrl: `${origin}/users/alice/outbox`,
  followersUrl: `${origin}/users/alice/followers`,
  followingUrl: `${origin}/users/alice/following`,
  publicKeyJwk: {},
  privateKeyJwk: {},
  passwordHash: null,
  discoverable: true,
  indexable: true,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

const localNote: LocalNoteRecord = {
  id: "e81bcdbe-5494-447b-b055-d357d18b75cb",
  actorId: localActor.id,
  activityId: `${origin}/users/alice/activities/hello`,
  objectId: `${origin}/users/alice/statuses/hello`,
  content: "Hello, fediverse!",
  publishedAt: new Date("2026-01-01T00:00:00Z"),
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

class MemoryActorStorage implements ActorStorage {
  readonly followers: LocalFollowerRecord[] = [];
  readonly favourites: LocalFavouriteRecord[] = [];

  async createActor(_input: CreateActorInput): Promise<LocalActorRecord> {
    return localActor;
  }

  async createNote(_input: CreateNoteInput): Promise<LocalNoteRecord> {
    throw new Error("Notes are not used in this test.");
  }

  async createFollower(
    input: CreateFollowerInput,
  ): Promise<LocalFollowerRecord> {
    const existing = this.followers.find(
      (follower) =>
        follower.actorId === input.actorId &&
        follower.followerActorUri === input.followerActorUri,
    );
    if (existing != null) return existing;

    const follower: LocalFollowerRecord = {
      id: crypto.randomUUID(),
      actorId: input.actorId,
      followerActorUri: input.followerActorUri,
      followerInboxUri: input.followerInboxUri,
      followerSharedInboxUri: input.followerSharedInboxUri ?? null,
      followedAt: input.followedAt ?? new Date(),
      acceptedAt: input.acceptedAt ?? null,
    };
    this.followers.push(follower);
    return follower;
  }

  async createFavourite(
    input: CreateFavouriteInput,
  ): Promise<LocalFavouriteRecord> {
    const existing = await this.findFavouriteByNoteAndActor(
      input.noteId,
      input.actorUri,
    );
    if (existing != null) return existing;

    const favourite: LocalFavouriteRecord = {
      id: crypto.randomUUID(),
      noteId: input.noteId,
      actorUri: input.actorUri,
      activityId: input.activityId,
      createdAt: input.createdAt ?? new Date(),
    };
    this.favourites.push(favourite);
    return favourite;
  }

  async updateActorProfile(
    id: string,
    input: UpdateActorProfileInput,
  ): Promise<LocalActorRecord | undefined> {
    if (id !== localActor.id) return undefined;
    Object.assign(localActor, input, { updatedAt: new Date() });
    return localActor;
  }

  async markFollowerAccepted(
    id: string,
  ): Promise<LocalFollowerRecord | undefined> {
    const follower = this.followers.find((item) => item.id === id);
    if (follower != null) follower.acceptedAt = new Date();
    return follower;
  }

  async findActorByIdentifier(
    identifier: string,
  ): Promise<LocalActorRecord | undefined> {
    return identifier === localActor.identifier ? localActor : undefined;
  }

  async findActorById(id: string): Promise<LocalActorRecord | undefined> {
    return id === localActor.id ? localActor : undefined;
  }

  async findNoteByObjectId(_objectId: string): Promise<LocalNoteRecord | undefined> {
    return _objectId === localNote.objectId ? localNote : undefined;
  }

  async findNoteByActivityId(
    activityId: string,
  ): Promise<LocalNoteRecord | undefined> {
    return activityId === localNote.activityId ? localNote : undefined;
  }

  async findNoteById(id: string): Promise<LocalNoteRecord | undefined> {
    return id === localNote.id ? localNote : undefined;
  }

  async findFavouriteByNoteAndActor(
    noteId: string,
    actorUri: string,
  ): Promise<LocalFavouriteRecord | undefined> {
    return this.favourites.find(
      (favourite) =>
        favourite.noteId === noteId && favourite.actorUri === actorUri,
    );
  }

  async findFavouriteByActivityId(
    activityId: string,
  ): Promise<LocalFavouriteRecord | undefined> {
    return this.favourites.find(
      (favourite) => favourite.activityId === activityId,
    );
  }

  async countFavouritesForNote(noteId: string): Promise<number> {
    return this.favourites.filter((favourite) => favourite.noteId === noteId)
      .length;
  }

  async deleteFavourite(id: string): Promise<void> {
    const index = this.favourites.findIndex((favourite) => favourite.id === id);
    if (index >= 0) this.favourites.splice(index, 1);
  }

  async listNotesForActor(_actorId: string): Promise<LocalNoteRecord[]> {
    return [];
  }

  async listAcceptedFollowersForActor(
    actorId: string,
  ): Promise<LocalFollowerRecord[]> {
    return this.followers.filter(
      (follower) => follower.actorId === actorId && follower.acceptedAt != null,
    );
  }

  async listPublicLocalNotes(): Promise<
    { actor: LocalActorRecord; note: LocalNoteRecord }[]
  > {
    return [];
  }
}

function createFollow(): Follow {
  const follower = new Person({
    id: new URL("https://remote.example/users/bob"),
    inbox: new URL("https://remote.example/users/bob/inbox"),
  });
  return new Follow({
    id: new URL("https://remote.example/activities/follow-alice"),
    actor: follower,
    object: new URL(`${origin}/users/alice`),
  });
}

function createFollowContext() {
  const federation = createFederation<FederationContextData>({
    contextData: { origin },
  });
  const sentActivities: Activity[] = [];
  const context = createInboxContext({
    data: { origin },
    federation,
    recipient: "alice",
    sendActivity: async (_sender, _recipients, activity) => {
      sentActivities.push(activity);
    },
  });

  return { context, federation, sentActivities };
}

function createLike(): Like {
  const actor = new Person({
    id: new URL("https://remote.example/users/bob"),
    inbox: new URL("https://remote.example/users/bob/inbox"),
  });
  return new Like({
    id: new URL("https://remote.example/activities/like-hello"),
    actor,
    object: new URL(localNote.objectId),
  });
}

describe("FederationService.acceptFollow", () => {
  test("persists a follower and sends an Accept activity", async () => {
    const storage = new MemoryActorStorage();
    const service = new FederationService(new ActorService(storage));
    const { context, federation, sentActivities } = createFollowContext();

    await service.acceptFollow(context, createFollow());

    expect(storage.followers).toHaveLength(1);
    expect(storage.followers[0]?.followerActorUri).toBe(
      "https://remote.example/users/bob",
    );
    expect(storage.followers[0]?.acceptedAt).not.toBeNull();
    expect(sentActivities).toHaveLength(1);

    const sent = sentActivities[0];
    expect(sent).toBeInstanceOf(Accept);
    expect(sent?.actorId?.href).toBe(`${origin}/users/alice`);
    expect(sent?.objectId?.href).toBe(
      "https://remote.example/activities/follow-alice",
    );

    const followers = await service.getFollowers(context, "alice");
    expect(followers?.items[0]?.id?.href).toBe(
      "https://remote.example/users/bob",
    );
    const requestContext = createRequestContext({
      data: { origin },
      federation,
      url: new URL(origin),
    });
    expect(await service.countFollowers(requestContext, "alice")).toBe(1);
  });

  test("does not send a second Accept for a persisted follower", async () => {
    const storage = new MemoryActorStorage();
    const service = new FederationService(new ActorService(storage));
    const { context, sentActivities } = createFollowContext();
    const follow = createFollow();

    await service.acceptFollow(context, follow);
    await service.acceptFollow(context, follow);

    expect(storage.followers).toHaveLength(1);
    expect(sentActivities).toHaveLength(1);
  });

  test("ignores a Follow addressed to a different actor", async () => {
    const storage = new MemoryActorStorage();
    const service = new FederationService(new ActorService(storage));
    const { context, sentActivities } = createFollowContext();
    const follow = createFollow().clone({
      object: new URL(`${origin}/users/not-alice`),
    });

    await service.acceptFollow(context, follow);

    expect(storage.followers).toHaveLength(0);
    expect(sentActivities).toHaveLength(0);
  });
});

describe("FederationService.deliverCreate", () => {
  test("sends a Create activity to followers", async () => {
    const service = new FederationService(
      new ActorService(new MemoryActorStorage()),
    );
    const federation = createFederation<FederationContextData>({
      contextData: { origin },
    });
    service.setFederation(federation);

    await service.deliverCreate({
      actor: localActor,
      note: localNote,
      origin,
    });

    expect(federation.sentActivities).toHaveLength(1);
    const sent = federation.sentActivities[0];
    expect(sent?.activity).toBeInstanceOf(Create);
    expect(sent?.activity.id?.href).toBe(localNote.activityId);
  });
});

describe("FederationService Like handling", () => {
  test("persists an incoming Like and removes it only when its actor sends Undo", async () => {
    const storage = new MemoryActorStorage();
    const service = new FederationService(new ActorService(storage));
    const { context } = createFollowContext();
    const like = createLike();

    await service.acceptLike(context, like);
    await service.acceptLike(context, like);

    expect(storage.favourites).toHaveLength(1);
    expect(storage.favourites[0]?.actorUri).toBe(
      "https://remote.example/users/bob",
    );

    const undo = new Undo({
      id: new URL("https://remote.example/activities/undo-like-hello"),
      actor: new Person({
        id: new URL("https://remote.example/users/bob"),
        inbox: new URL("https://remote.example/users/bob/inbox"),
      }),
      object: like,
    });
    await service.acceptUndo(context, undo);

    expect(storage.favourites).toHaveLength(0);
  });

  test("sends Like and Undo activities to the post author", async () => {
    const storage = new MemoryActorStorage();
    const service = new FederationService(new ActorService(storage));
    const federation = createFederation<FederationContextData>({
      contextData: { origin },
    });
    service.setFederation(federation);
    const favourite = await storage.createFavourite({
      noteId: localNote.id,
      actorUri: `${origin}/users/alice`,
      activityId: `${origin}/users/alice/activities/like-hello`,
    });

    await service.deliverLike({
      actor: localActor,
      note: localNote,
      favourite,
      origin,
    });
    await service.deliverUndoLike({
      actor: localActor,
      note: localNote,
      favourite,
      origin,
    });

    expect(federation.sentActivities).toHaveLength(2);
    expect(federation.sentActivities[0]?.activity).toBeInstanceOf(Like);
    expect(federation.sentActivities[1]?.activity).toBeInstanceOf(Undo);
  });
});

describe("ActivityPub object responses", () => {
  test("serves a status as an ActivityStreams Note when requested", async () => {
    const service = new FederationService(new ActorService(new MemoryActorStorage()));
    const app = new Hono();
    app.use("*", await createFederationMiddleware(service));

    const response = await app.request(localNote.objectId, {
      headers: { Accept: "application/activity+json" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(
      "application/activity+json",
    );
    expect(response.headers.get("vary")).toBe("Accept");
    expect(await response.json()).toMatchObject({
      type: "Note",
      id: localNote.objectId,
      attributedTo: `${origin}/users/alice`,
      content: localNote.content,
    });
  });

  test("serves a Create activity by its ActivityPub activity URL", async () => {
    const service = new FederationService(new ActorService(new MemoryActorStorage()));
    const app = new Hono();
    app.use("*", await createFederationMiddleware(service));

    const response = await app.request(localNote.activityId, {
      headers: { Accept: "application/activity+json" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      type: "Create",
      id: localNote.activityId,
      actor: `${origin}/users/alice`,
    });
  });
});
