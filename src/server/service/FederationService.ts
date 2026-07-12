import type {
  Context,
  Federation,
  InboxContext,
  NodeInfo,
  RequestContext,
} from "@fedify/fedify";
import {
  Accept,
  Create,
  Endpoints,
  Like,
  Note,
  Person,
  PUBLIC_COLLECTION,
  Undo,
} from "@fedify/vocab";
import { Temporal } from "@js-temporal/polyfill";
import { getActorPath } from "../LocalActor";
import {
  actorService,
  type ActorService,
  type LocalActorRecord,
  type LocalFavouriteRecord,
  type LocalNoteRecord,
} from "./actorService";

export type FederationContextData = {
  origin: string;
};

async function createPerson({
  actor,
  context,
  identifier,
}: {
  actor: LocalActorRecord;
  context: RequestContext<FederationContextData>;
  identifier: string;
}) {
  const keyPairs = await context.getActorKeyPairs(identifier);
  const keyPair = keyPairs[0];

  return new Person({
    id: context.getActorUri(identifier),
    preferredUsername: identifier,
    name: actor.name,
    summary: actor.summary,
    url: new URL(getActorPath(identifier), context.data.origin),
    inbox: context.getInboxUri(identifier),
    outbox: context.getOutboxUri(identifier),
    followers: context.getFollowersUri(identifier),
    following: context.getFollowingUri(identifier),
    endpoints: new Endpoints({
      sharedInbox: context.getInboxUri(),
    }),
    publicKey: keyPair?.cryptographicKey ?? null,
    assertionMethods: keyPair == null ? [] : [keyPair.multikey],
    published: Temporal.Instant.from(actor.createdAt.toISOString()),
    discoverable: actor.discoverable,
    indexable: actor.indexable,
  });
}

function createNoteObject({
  actorUri,
  note,
}: {
  actorUri: URL;
  note: LocalNoteRecord;
}) {
  return new Note({
    id: new URL(note.objectId),
    attribution: actorUri,
    content: note.content,
    published: Temporal.Instant.from(note.publishedAt.toISOString()),
    to: PUBLIC_COLLECTION,
  });

}

function createOutboxItem({
  actorUri,
  note,
}: {
  actorUri: URL;
  note: LocalNoteRecord;
}) {
  return new Create({
    id: new URL(note.activityId),
    actor: actorUri,
    object: createNoteObject({ actorUri, note }),
    published: Temporal.Instant.from(note.publishedAt.toISOString()),
    to: PUBLIC_COLLECTION,
  });
}

export class FederationService {
  private federation: Federation<FederationContextData> | null = null;

  constructor(private readonly actorService: ActorService) {}

  setFederation(federation: Federation<FederationContextData>): void {
    this.federation = federation;
  }

  getNodeInfo(): NodeInfo {
    return {
      software: {
        name: "yuragi",
        version: "0.1.0",
      },
      protocols: ["activitypub"],
      openRegistrations: false,
      usage: {
        users: {
          total: 1,
          activeMonth: 1,
          activeHalfyear: 1,
        },
        localPosts: 0,
        localComments: 0,
      },
      metadata: {
        description: "A minimal ActivityPub server built with Fedify and Hono.",
      },
    };
  }

  async getActor(
    context: RequestContext<FederationContextData>,
    identifier: string,
  ) {
    const actor = await this.actorService.findActorByIdentifier(identifier);
    if (actor == null) return null;

    return createPerson({ actor, context, identifier });
  }

  async getStatus(
    context: RequestContext<FederationContextData>,
    {
      identifier,
      statusId,
    }: { identifier: string; statusId: string },
  ): Promise<Note | null> {
    const note = await this.actorService.findNoteByObjectId(
      new URL(`/users/${identifier}/statuses/${statusId}`, context.data.origin)
        .href,
    );
    if (note == null) return null;

    const actor = await this.actorService.findActorById(note.actorId);
    if (actor?.identifier !== identifier) return null;

    return createNoteObject({
      actorUri: context.getActorUri(identifier),
      note,
    });
  }

  async getCreateActivity(
    context: RequestContext<FederationContextData>,
    {
      identifier,
      activityId,
    }: { identifier: string; activityId: string },
  ): Promise<Create | null> {
    const note = await this.actorService.findNoteByActivityId(
      new URL(`/users/${identifier}/activities/${activityId}`, context.data.origin)
        .href,
    );
    if (note == null) return null;

    const actor = await this.actorService.findActorById(note.actorId);
    if (actor?.identifier !== identifier) return null;

    return createOutboxItem({
      actorUri: context.getActorUri(identifier),
      note,
    });
  }

  async getActorKeyPairs(
    _context: Context<FederationContextData>,
    identifier: string,
  ) {
    const actor = await this.actorService.findActorByIdentifier(identifier);
    if (actor == null) return [];

    return [await this.actorService.importActorKeyPair(actor)];
  }

  async getInbox(
    _context: RequestContext<FederationContextData>,
    identifier: string,
  ) {
    if ((await this.actorService.findActorByIdentifier(identifier)) == null) {
      return null;
    }

    return { items: [] };
  }

  async acceptFollow(
    context: InboxContext<FederationContextData>,
    follow: import("@fedify/vocab").Follow,
  ): Promise<void> {
    if (context.recipient == null) return;

    const actor = await this.actorService.findActorByIdentifier(
      context.recipient,
    );
    if (actor == null) return;

    const actorUri = new URL(getActorPath(actor.identifier), context.data.origin);
    if (follow.objectId?.href !== actorUri.href) return;

    const remoteActor = await follow.getActor(context);
    if (
      remoteActor == null ||
      remoteActor.id == null ||
      remoteActor.inboxId == null
    ) {
      return;
    }

    const follower = await this.actorService.createFollower({
      actorId: actor.id,
      followerActorUri: remoteActor.id.href,
      followerInboxUri: remoteActor.inboxId.href,
      followerSharedInboxUri: remoteActor.endpoints?.sharedInbox?.href ?? null,
    });
    if (follower.acceptedAt != null) return;

    const accept = new Accept({
      id: new URL(
        `${getActorPath(actor.identifier)}/activities/${crypto.randomUUID()}`,
        context.data.origin,
      ),
      actor: actorUri,
      object: follow,
      to: remoteActor.id,
    });

    await context.sendActivity({ identifier: actor.identifier }, remoteActor, accept);
    await this.actorService.markFollowerAccepted(follower.id);
  }

  async deliverCreate({
    actor,
    note,
    origin,
  }: {
    actor: LocalActorRecord;
    note: LocalNoteRecord;
    origin: string;
  }): Promise<void> {
    if (this.federation == null) {
      throw new Error("Federation is not initialized.");
    }

    const context = this.federation.createContext(new URL(origin), { origin });
    await context.sendActivity(
      { identifier: actor.identifier },
      "followers",
      createOutboxItem({
        actorUri: new URL(getActorPath(actor.identifier), origin),
        note,
      }),
    );
  }

  async acceptLike(
    context: InboxContext<FederationContextData>,
    like: Like,
  ): Promise<void> {
    if (like.id == null || like.objectId == null) return;

    const remoteActor = await like.getActor(context);
    if (remoteActor?.id == null || like.actorId?.href !== remoteActor.id.href) {
      return;
    }

    const note = await this.actorService.findNoteByObjectId(like.objectId.href);
    if (note == null) return;

    await this.actorService.createFavourite({
      noteId: note.id,
      actorUri: remoteActor.id.href,
      activityId: like.id.href,
    });
  }

  async acceptUndo(
    context: InboxContext<FederationContextData>,
    undo: Undo,
  ): Promise<void> {
    if (undo.objectId == null) return;

    const remoteActor = await undo.getActor(context);
    if (remoteActor?.id == null || undo.actorId?.href !== remoteActor.id.href) {
      return;
    }

    const favourite = await this.actorService.findFavouriteByActivityId(
      undo.objectId.href,
    );
    if (favourite?.actorUri !== remoteActor.id.href) return;

    await this.actorService.deleteFavourite(favourite.id);
  }

  async deliverLike({
    actor,
    note,
    favourite,
    origin,
  }: {
    actor: LocalActorRecord;
    note: LocalNoteRecord;
    favourite: LocalFavouriteRecord;
    origin: string;
  }): Promise<void> {
    if (this.federation == null) {
      throw new Error("Federation is not initialized.");
    }

    const noteActor = await this.actorService.findActorById(note.actorId);
    if (noteActor == null) throw new Error("Note actor was not found.");

    const actorUri = new URL(getActorPath(actor.identifier), origin);
    const recipient = new Person({
      id: new URL(getActorPath(noteActor.identifier), origin),
      inbox: new URL(noteActor.inboxUrl),
    });
    const like = new Like({
      id: new URL(favourite.activityId),
      actor: actorUri,
      object: new URL(note.objectId),
      to: recipient.id,
    });
    const context = this.federation.createContext(new URL(origin), { origin });
    await context.sendActivity({ identifier: actor.identifier }, recipient, like);
  }

  async deliverUndoLike({
    actor,
    note,
    favourite,
    origin,
  }: {
    actor: LocalActorRecord;
    note: LocalNoteRecord;
    favourite: LocalFavouriteRecord;
    origin: string;
  }): Promise<void> {
    if (this.federation == null) {
      throw new Error("Federation is not initialized.");
    }

    const noteActor = await this.actorService.findActorById(note.actorId);
    if (noteActor == null) throw new Error("Note actor was not found.");

    const actorUri = new URL(getActorPath(actor.identifier), origin);
    const recipient = new Person({
      id: new URL(getActorPath(noteActor.identifier), origin),
      inbox: new URL(noteActor.inboxUrl),
    });
    const like = new Like({
      id: new URL(favourite.activityId),
      actor: actorUri,
      object: new URL(note.objectId),
      to: recipient.id,
    });
    const undo = new Undo({
      id: new URL(
        `${getActorPath(actor.identifier)}/activities/${crypto.randomUUID()}`,
        origin,
      ),
      actor: actorUri,
      object: like,
      to: recipient.id,
    });
    const context = this.federation.createContext(new URL(origin), { origin });
    await context.sendActivity({ identifier: actor.identifier }, recipient, undo);
  }

  async getOutbox(
    context: RequestContext<FederationContextData>,
    identifier: string,
  ) {
    const actor = await this.actorService.findActorByIdentifier(identifier);
    if (actor == null) return null;
    const actorUri = context.getActorUri(identifier);
    const notes = await this.actorService.listNotesForActor(actor.id);

    return {
      items: notes.map((note) => createOutboxItem({ actorUri, note })),
    };
  }

  async countOutbox(
    _context: RequestContext<FederationContextData>,
    identifier: string,
  ) {
    const actor = await this.actorService.findActorByIdentifier(identifier);
    if (actor == null) return null;

    return (await this.actorService.listNotesForActor(actor.id)).length;
  }

  async getFollowers(
    _context: Context<FederationContextData>,
    identifier: string,
  ) {
    const actor = await this.actorService.findActorByIdentifier(identifier);
    if (actor == null) return null;

    const followers = await this.actorService.listAcceptedFollowersForActor(
      actor.id,
    );
    return {
      items: followers.map((follower) => ({
        id: new URL(follower.followerActorUri),
        inboxId: new URL(follower.followerInboxUri),
        endpoints:
          follower.followerSharedInboxUri == null
            ? null
            : { sharedInbox: new URL(follower.followerSharedInboxUri) },
      })),
    };
  }

  async countFollowers(
    _context: RequestContext<FederationContextData>,
    identifier: string,
  ) {
    const actor = await this.actorService.findActorByIdentifier(identifier);
    if (actor == null) return null;

    return (await this.actorService.listAcceptedFollowersForActor(actor.id)).length;
  }

  async getFollowing(
    _context: RequestContext<FederationContextData>,
    identifier: string,
  ) {
    if ((await this.actorService.findActorByIdentifier(identifier)) == null) {
      return null;
    }

    return { items: [] };
  }

  async countFollowing(
    _context: RequestContext<FederationContextData>,
    identifier: string,
  ) {
    if ((await this.actorService.findActorByIdentifier(identifier)) == null) {
      return null;
    }

    return 0;
  }
}

export const federationService = new FederationService(actorService);
