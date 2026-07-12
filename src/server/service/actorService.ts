import { exportJwk, generateCryptoKeyPair, importJwk } from "@fedify/fedify";
import {
  actorStorage,
  type ActorStorage,
  type CreateFollowerInput,
  type CreateFavouriteInput,
  type LocalActorRecord,
  type LocalFavouriteRecord,
  type LocalFollowerRecord,
  type LocalNoteRecord,
  type UpdateActorProfileInput,
} from "../infra/ActorStorage";
import { getActorPath } from "../LocalActor";

export type {
  ActorStorage,
  CreateFollowerInput,
  CreateFavouriteInput,
  LocalActorRecord,
  LocalFavouriteRecord,
  LocalFollowerRecord,
  LocalNoteRecord,
  UpdateActorProfileInput,
};

export type MastodonAccount = {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  locked: boolean;
  bot: boolean;
  discoverable: boolean;
  indexable: boolean;
  group: boolean;
  created_at: string;
  note: string;
  url: string;
  uri: string;
  avatar: string;
  avatar_static: string;
  header: string;
  header_static: string;
  followers_count: number;
  following_count: number;
  statuses_count: number;
  last_status_at: string | null;
  fields: [];
  emojis: [];
};

export type MastodonStatus = {
  id: string;
  uri: string;
  url: string;
  account: MastodonAccount;
  content: string;
  created_at: string;
  visibility: "public";
  sensitive: boolean;
  spoiler_text: string;
  media_attachments: [];
  application: null;
  mentions: [];
  tags: [];
  emojis: [];
  reblogs_count: number;
  favourites_count: number;
  replies_count: number;
  reblog: null;
  favourited: boolean;
  in_reply_to_id: null;
  in_reply_to_account_id: null;
};

type ActorSeed = {
  origin: string;
  identifier: string;
  name?: string;
  summary?: string;
};

function actorUrls(origin: string, identifier: string) {
  const path = getActorPath(identifier);
  return {
    actorUrl: new URL(path, origin).href,
    inboxUrl: new URL(`${path}/inbox`, origin).href,
    outboxUrl: new URL(`${path}/outbox`, origin).href,
    followersUrl: new URL(`${path}/followers`, origin).href,
    followingUrl: new URL(`${path}/following`, origin).href,
  };
}

export class ActorService {
  constructor(private readonly storage: ActorStorage) {}

  async createAccountActor({
    origin,
    identifier,
    name,
    summary,
  }: ActorSeed): Promise<LocalActorRecord> {
    const existing = await this.findActorByIdentifier(identifier);
    if (existing != null) return existing;

    const keyPair = await generateCryptoKeyPair("RSASSA-PKCS1-v1_5");
    const urls = actorUrls(origin, identifier);
    const created = await this.storage.createActor({
      identifier,
      preferredUsername: identifier,
      name: name ?? identifier,
      summary,
      inboxUrl: urls.inboxUrl,
      outboxUrl: urls.outboxUrl,
      followersUrl: urls.followersUrl,
      followingUrl: urls.followingUrl,
      publicKeyJwk: await exportJwk(keyPair.publicKey),
      privateKeyJwk: await exportJwk(keyPair.privateKey),
    });

    return created;
  }

  findActorByIdentifier(
    identifier: string,
  ): Promise<LocalActorRecord | undefined> {
    return this.storage.findActorByIdentifier(identifier);
  }

  findActorById(id: string): Promise<LocalActorRecord | undefined> {
    return this.storage.findActorById(id);
  }

  findActorByAcct(acct: string): Promise<LocalActorRecord | undefined> {
    const username = acct.split("@", 1)[0];
    if (username == null || username === "") return Promise.resolve(undefined);
    return this.findActorByIdentifier(username);
  }

  updateActorProfile(
    id: string,
    input: UpdateActorProfileInput,
  ): Promise<LocalActorRecord | undefined> {
    return this.storage.updateActorProfile(id, input);
  }

  async importActorKeyPair(actor: LocalActorRecord): Promise<CryptoKeyPair> {
    return {
      publicKey: await importJwk(actor.publicKeyJwk as JsonWebKey, "public"),
      privateKey: await importJwk(actor.privateKeyJwk as JsonWebKey, "private"),
    };
  }

  listNotesForActor(actorId: string): Promise<LocalNoteRecord[]> {
    return this.storage.listNotesForActor(actorId);
  }

  findNoteById(id: string): Promise<LocalNoteRecord | undefined> {
    return this.storage.findNoteById(id);
  }

  findNoteByObjectId(objectId: string): Promise<LocalNoteRecord | undefined> {
    return this.storage.findNoteByObjectId(objectId);
  }

  findNoteByActivityId(
    activityId: string,
  ): Promise<LocalNoteRecord | undefined> {
    return this.storage.findNoteByActivityId(activityId);
  }

  findFavouriteByNoteAndActor(
    noteId: string,
    actorUri: string,
  ): Promise<LocalFavouriteRecord | undefined> {
    return this.storage.findFavouriteByNoteAndActor(noteId, actorUri);
  }

  findFavouriteByActivityId(
    activityId: string,
  ): Promise<LocalFavouriteRecord | undefined> {
    return this.storage.findFavouriteByActivityId(activityId);
  }

  createFavourite(input: CreateFavouriteInput): Promise<LocalFavouriteRecord> {
    return this.storage.createFavourite(input);
  }

  deleteFavourite(id: string): Promise<void> {
    return this.storage.deleteFavourite(id);
  }

  createFollower(input: CreateFollowerInput): Promise<LocalFollowerRecord> {
    return this.storage.createFollower(input);
  }

  markFollowerAccepted(id: string): Promise<LocalFollowerRecord | undefined> {
    return this.storage.markFollowerAccepted(id);
  }

  listAcceptedFollowersForActor(
    actorId: string,
  ): Promise<LocalFollowerRecord[]> {
    return this.storage.listAcceptedFollowersForActor(actorId);
  }

  listPublicLocalNotes(): Promise<
    { actor: LocalActorRecord; note: LocalNoteRecord }[]
  > {
    return this.storage.listPublicLocalNotes();
  }

  async createPublicNote({
    actor,
    content,
    origin,
  }: {
    actor: LocalActorRecord;
    content: string;
    origin: string;
  }): Promise<LocalNoteRecord> {
    const noteIdentifier = crypto.randomUUID();
    const actorPath = getActorPath(actor.identifier);

    return this.storage.createNote({
      actorId: actor.id,
      activityId: new URL(
        `${actorPath}/activities/${noteIdentifier}`,
        origin,
      ).href,
      objectId: new URL(`${actorPath}/statuses/${noteIdentifier}`, origin)
        .href,
      content,
      publishedAt: new Date(),
    });
  }

  async toMastodonAccount(
    actor: LocalActorRecord,
    origin: string,
  ): Promise<MastodonAccount> {
    const actorUrl = new URL(getActorPath(actor.identifier), origin).href;
    const actorNotes = await this.listNotesForActor(actor.id);
    const lastStatusAt = actorNotes[0]?.publishedAt ?? null;

    return {
      id: actor.id,
      username: actor.preferredUsername,
      acct: actor.preferredUsername,
      display_name: actor.name,
      locked: false,
      bot: false,
      discoverable: actor.discoverable,
      indexable: actor.indexable,
      group: false,
      created_at: actor.createdAt.toISOString(),
      note: actor.summary ?? "",
      url: actorUrl,
      uri: actorUrl,
      avatar: new URL("/avatar.png", origin).href,
      avatar_static: new URL("/avatar.png", origin).href,
      header: new URL("/header.png", origin).href,
      header_static: new URL("/header.png", origin).href,
      followers_count: 0,
      following_count: 0,
      statuses_count: actorNotes.length,
      last_status_at: lastStatusAt?.toISOString().slice(0, 10) ?? null,
      fields: [],
      emojis: [],
    };
  }

  async toMastodonStatus(
    note: LocalNoteRecord,
    actor: LocalActorRecord,
    origin: string,
    viewerActorUri?: string,
  ): Promise<MastodonStatus> {
    const [favouritesCount, viewerFavourite] = await Promise.all([
      this.storage.countFavouritesForNote(note.id),
      viewerActorUri == null
        ? undefined
        : this.storage.findFavouriteByNoteAndActor(note.id, viewerActorUri),
    ]);

    return {
      id: note.id,
      uri: note.objectId,
      url: note.objectId,
      account: await this.toMastodonAccount(actor, origin),
      content: note.content,
      created_at: note.publishedAt.toISOString(),
      visibility: "public",
      sensitive: false,
      spoiler_text: "",
      media_attachments: [],
      application: null,
      mentions: [],
      tags: [],
      emojis: [],
      reblogs_count: 0,
      favourites_count: favouritesCount,
      replies_count: 0,
      reblog: null,
      favourited: viewerFavourite != null,
      in_reply_to_id: null,
      in_reply_to_account_id: null,
    };
  }
}

export const actorService = new ActorService(actorStorage);
