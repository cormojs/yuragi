import { apiClient } from "./client";

export async function getInstanceSummary() {
  const response = await apiClient.api.v1.instance.$get();

  if (!response.ok) {
    throw new Error("Failed to load instance summary.");
  }

  const instance = await response.json();
  return {
    name: instance.title,
    description: instance.short_description,
  };
}
