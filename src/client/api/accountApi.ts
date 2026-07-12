import { apiClient } from "./client";

export async function lookupAccount(identifier: string) {
  const response = await apiClient.api.v1.accounts.lookup.$get({
    query: { acct: identifier },
  });

  if (!response.ok) {
    throw new Error("Account was not found.");
  }

  return response.json();
}

export async function getAccountStatuses(accountId: string) {
  const response = await apiClient.api.v1.accounts[":id"].statuses.$get({
    param: { id: accountId },
  });

  if (!response.ok) {
    throw new Error("Account statuses were not found.");
  }

  return response.json();
}
