import { authStorage, type PostgresAuthStorage } from "../infra/AuthStorage";
import type { LocalActorRecord } from "../infra/ActorStorage";

const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 30;

function createToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function isValidAccountIdentifier(identifier: string): boolean {
  return /^[a-z0-9_][a-z0-9_-]{0,29}$/.test(identifier);
}

export class AuthService {
  constructor(private readonly storage: PostgresAuthStorage = authStorage) {}

  async setInitialPassword({
    identifier,
    password,
  }: {
    identifier: string;
    password: string;
  }): Promise<LocalActorRecord | undefined> {
    if (!isValidAccountIdentifier(identifier)) {
      throw new Error("Account identifiers must be 1-30 lowercase letters, numbers, underscores, or hyphens.");
    }
    if (password.length < 8) {
      throw new Error("Passwords must be at least 8 characters long.");
    }

    const passwordHash = await Bun.password.hash(password, {
      algorithm: "argon2id",
    });
    return this.storage.setPasswordHash(identifier, passwordHash);
  }

  async login({
    identifier,
    password,
  }: {
    identifier: string;
    password: string;
  }): Promise<{ actor: LocalActorRecord; token: string } | undefined> {
    const actor = await this.storage.findActorForLogin(identifier);
    if (actor?.passwordHash == null) return undefined;

    if (!(await Bun.password.verify(password, actor.passwordHash))) {
      return undefined;
    }

    const token = createToken();
    await this.storage.createSession({
      actorId: actor.id,
      tokenHash: await hashToken(token),
      expiresAt: new Date(Date.now() + sessionLifetimeMs),
    });
    return { actor, token };
  }

  async changePassword({
    identifier,
    password,
  }: {
    identifier: string;
    password: string;
  }): Promise<LocalActorRecord | undefined> {
    if (!isValidAccountIdentifier(identifier)) {
      throw new Error("Account identifiers must be 1-30 lowercase letters, numbers, underscores, or hyphens.");
    }
    if (password.length < 8) {
      throw new Error("Passwords must be at least 8 characters long.");
    }

    const passwordHash = await Bun.password.hash(password, {
      algorithm: "argon2id",
    });
    return this.storage.updatePasswordHash(identifier, passwordHash);
  }

  async deleteAccount(identifier: string): Promise<LocalActorRecord | undefined> {
    if (!isValidAccountIdentifier(identifier)) {
      throw new Error("Account identifiers must be 1-30 lowercase letters, numbers, underscores, or hyphens.");
    }
    return this.storage.deleteAccount(identifier);
  }

  async getSessionActor(token: string | undefined): Promise<LocalActorRecord | undefined> {
    if (token == null || token === "") return undefined;
    return this.storage.findSessionActor(await hashToken(token));
  }

  async logout(token: string | undefined): Promise<void> {
    if (token == null || token === "") return;
    await this.storage.deleteSession(await hashToken(token));
  }
}

export const authService = new AuthService();
