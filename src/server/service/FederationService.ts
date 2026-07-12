import type { Context, NodeInfo, RequestContext } from "@fedify/fedify";
import {
  Create,
  Endpoints,
  Note,
  Person,
  PUBLIC_COLLECTION,
} from "@fedify/vocab";
import { Temporal } from "@js-temporal/polyfill";
import { getActorPath, isLocalActor } from "../LocalActor";
import {
  actorService,
  type ActorService,
  type LocalActorRecord,
  type LocalNoteRecord,
} from "./actorService";

export type FederationContextData = {
  origin: string;
};

export type FederationDependencies = {
  isLocalActor: typeof isLocalActor;
};

const defaultDependencies: FederationDependencies = {
  isLocalActor,
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

function createOutboxItem({
  actorUri,
  note,
}: {
  actorUri: URL;
  note: LocalNoteRecord;
}) {
  const object = new Note({
    id: new URL(note.objectId),
    attribution: actorUri,
    content: note.content,
    published: Temporal.Instant.from(note.publishedAt.toISOString()),
    to: PUBLIC_COLLECTION,
  });

  return new Create({
    id: new URL(note.activityId),
    actor: actorUri,
    object,
    published: Temporal.Instant.from(note.publishedAt.toISOString()),
    to: PUBLIC_COLLECTION,
  });
}

export class FederationService {
  constructor(
    private readonly actorService: ActorService,
    private readonly dependencies: FederationDependencies = defaultDependencies,
  ) {}

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
    if (!this.dependencies.isLocalActor(identifier)) return null;

    const actor = await this.actorService.ensureLocalActor({
      identifier,
      origin: context.data.origin,
    });

    return createPerson({ actor, context, identifier });
  }

  async getActorKeyPairs(
    context: Context<FederationContextData>,
    identifier: string,
  ) {
    if (!this.dependencies.isLocalActor(identifier)) return [];

    const actor = await this.actorService.ensureLocalActor({
      identifier,
      origin: context.data.origin,
    });

    return [await this.actorService.importActorKeyPair(actor)];
  }

  async getInbox(
    context: RequestContext<FederationContextData>,
    identifier: string,
  ) {
    if (!this.dependencies.isLocalActor(identifier)) return null;

    await this.actorService.ensureLocalActor({
      identifier,
      origin: context.data.origin,
    });

    return { items: [] };
  }

  async getOutbox(
    context: RequestContext<FederationContextData>,
    identifier: string,
  ) {
    if (!this.dependencies.isLocalActor(identifier)) return null;

    const actor = await this.actorService.ensureLocalActor({
      identifier,
      origin: context.data.origin,
    });
    const actorUri = context.getActorUri(identifier);
    const notes = await this.actorService.listNotesForActor(actor.id);

    return {
      items: notes.map((note) => createOutboxItem({ actorUri, note })),
    };
  }

  async countOutbox(
    context: RequestContext<FederationContextData>,
    identifier: string,
  ) {
    if (!this.dependencies.isLocalActor(identifier)) return null;

    const actor = await this.actorService.ensureLocalActor({
      identifier,
      origin: context.data.origin,
    });

    return (await this.actorService.listNotesForActor(actor.id)).length;
  }

  async getFollowers(
    context: Context<FederationContextData>,
    identifier: string,
  ) {
    if (!this.dependencies.isLocalActor(identifier)) return null;

    await this.actorService.ensureLocalActor({
      identifier,
      origin: context.data.origin,
    });

    return { items: [] };
  }

  async countFollowers(
    context: RequestContext<FederationContextData>,
    identifier: string,
  ) {
    if (!this.dependencies.isLocalActor(identifier)) return null;

    await this.actorService.ensureLocalActor({
      identifier,
      origin: context.data.origin,
    });

    return 0;
  }

  async getFollowing(
    context: RequestContext<FederationContextData>,
    identifier: string,
  ) {
    if (!this.dependencies.isLocalActor(identifier)) return null;

    await this.actorService.ensureLocalActor({
      identifier,
      origin: context.data.origin,
    });

    return { items: [] };
  }

  async countFollowing(
    context: RequestContext<FederationContextData>,
    identifier: string,
  ) {
    if (!this.dependencies.isLocalActor(identifier)) return null;

    await this.actorService.ensureLocalActor({
      identifier,
      origin: context.data.origin,
    });

    return 0;
  }
}

export const federationService = new FederationService(actorService);
