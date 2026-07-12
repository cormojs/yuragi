import { exportJwk, generateCryptoKeyPair, importJwk } from "@fedify/fedify";
import {
  actorStorage,
  type ActorStorage,
  type LocalActorRecord,
  type LocalNoteRecord,
} from "../infra/ActorStorage";
import { getActorPath } from "../LocalActor";

export type { ActorStorage, LocalActorRecord, LocalNoteRecord };

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

  async importActorKeyPair(actor: LocalActorRecord): Promise<CryptoKeyPair> {
    return {
      publicKey: await importJwk(actor.publicKeyJwk as JsonWebKey, "public"),
      privateKey: await importJwk(actor.privateKeyJwk as JsonWebKey, "private"),
    };
  }

  listNotesForActor(actorId: string): Promise<LocalNoteRecord[]> {
    return this.storage.listNotesForActor(actorId);
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
  ): Promise<MastodonStatus> {
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
      favourites_count: 0,
      replies_count: 0,
      reblog: null,
      in_reply_to_id: null,
      in_reply_to_account_id: null,
    };
  }
}

export const actorService = new ActorService(actorStorage);
