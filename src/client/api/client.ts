import { hc } from "hono/client";
import type { AppType } from "../../server/controller/ApiController";
import type { TimelinePost } from "../types/timeline";

export const apiClient = hc<AppType>(window.location.origin);

export type AuthenticatedAccount = {
  username: string;
};

function formatPublishedLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return typeof body?.error === "string" ? body.error : "Request failed.";
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
  return response.json();
}

export async function logout(): Promise<void> {
  const response = await apiClient.api.v1.auth.logout.$post();
  if (!response.ok) throw new Error(await readError(response));
}

export async function getCurrentAccount(): Promise<AuthenticatedAccount | null> {
  const response = await apiClient.api.v1.auth.me.$get();
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(await readError(response));
  const responseJson = await response.json();
  return {
    username: responseJson.username,
  };
}

export async function createStatus(content: string): Promise<void> {
  const response = await apiClient.api.v1.statuses.$post({
    json: { content, visibility: "public" },
  });
  if (!response.ok) throw new Error(await readError(response));
}
