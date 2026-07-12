import { hc } from "hono/client";
import type { AppType } from "../../server/controller/ApiController";
import type { TimelinePost } from "../types/timeline";

export const apiClient = hc<AppType>(window.location.origin);

export type AuthenticatedAccount = {
  username: string;
  displayName: string;
  note: string;
  discoverable: boolean;
  indexable: boolean;
};

type MastodonAccountResponse = {
  username: string;
  display_name: string;
  note: string;
  discoverable: boolean;
  indexable: boolean;
};

function formatPublishedLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (
    typeof body === "object" &&
    body != null &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }

  return "Request failed.";
}

function toAuthenticatedAccount(
  response: MastodonAccountResponse,
): AuthenticatedAccount {
  return {
    username: response.username,
    displayName: response.display_name,
    note: response.note,
    discoverable: response.discoverable,
    indexable: response.indexable,
  };
}

export async function getInstanceSummary() {
  const response = await apiClient.api.v1.instance.$get();
  if (!response.ok) throw new Error("Failed to load instance summary.");

  const instance = await response.json();
  return {
    name: instance.title,
    description: instance.short_description,
  };
}

export async function lookupAccount(identifier: string) {
  const response = await apiClient.api.v1.accounts.lookup.$get({
    query: { acct: identifier },
  });
  if (!response.ok) throw new Error("Account was not found.");
  return response.json();
}

export async function getAccountStatuses(accountId: string) {
  const response = await apiClient.api.v1.accounts[":id"].statuses.$get({
    param: { id: accountId },
  });
  if (!response.ok) throw new Error("Account statuses were not found.");
  return response.json();
}

export async function getAccountFollowers(accountId: string) {
  const response = await apiClient.api.v1.accounts[":id"].followers.$get({
    param: { id: accountId },
  });
  if (!response.ok) throw new Error("Account followers were not found.");
  return response.json();
}

export async function getLocalTimeline(): Promise<TimelinePost[]> {
  const response = await apiClient.api.v1.timelines.public.$get({
    query: { local: "true" },
  });
  if (!response.ok) throw new Error("Failed to load the local timeline.");

  const statuses = await response.json();
  return statuses.map((status) => ({
    id: status.id,
    author: status.account.display_name || status.account.username,
    content: status.content,
    publishedAt: status.created_at,
    publishedLabel: formatPublishedLabel(status.created_at),
    favouritesCount: status.favourites_count,
    favourited: status.favourited,
  }));
}

export async function login(
  identifier: string,
  password: string,
): Promise<AuthenticatedAccount> {
  const response = await apiClient.api.v1.auth.login.$post({
    json: { identifier, password },
  });
  if (!response.ok) throw new Error(await readError(response));
  return toAuthenticatedAccount(await response.json());
}

export async function logout(): Promise<void> {
  const response = await apiClient.api.v1.auth.logout.$post();
  if (!response.ok) throw new Error(await readError(response));
}

export async function getCurrentAccount(): Promise<AuthenticatedAccount | null> {
  const response = await apiClient.api.v1.auth.me.$get();
  const status = response.status;
  if (status === 401) return null;
  if (status < 200 || status >= 300) throw new Error(await readError(response));

  return toAuthenticatedAccount(await response.json());
}

export async function updateProfile({
  displayName,
  note,
  discoverable,
  indexable,
}: Omit<AuthenticatedAccount, "username">): Promise<AuthenticatedAccount> {
  const response = await apiClient.api.v1.accounts.update_credentials.$patch({
    json: {
      display_name: displayName,
      note,
      discoverable,
      indexable,
    },
  });
  if (!response.ok) throw new Error(await readError(response));
  return toAuthenticatedAccount(await response.json());
}

export async function createStatus(content: string): Promise<void> {
  const response = await apiClient.api.v1.statuses.$post({
    json: { content, visibility: "public" },
  });
  if (!response.ok) throw new Error(await readError(response));
}

export async function favouriteStatus(statusId: string): Promise<void> {
  const response = await apiClient.api.v1.statuses[":id"].favourite.$post({
    param: { id: statusId },
  });
  if (!response.ok) throw new Error(await readError(response));
}

export async function unfavouriteStatus(statusId: string): Promise<void> {
  const response = await apiClient.api.v1.statuses[":id"].unfavourite.$post({
    param: { id: statusId },
  });
  if (!response.ok) throw new Error(await readError(response));
}
