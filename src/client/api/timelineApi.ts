import type { TimelinePost } from "../types/timeline";
import { apiClient } from "./client";

function formatPublishedLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export const timelineApi = {
  async getLocalTimeline(): Promise<TimelinePost[]> {
    const response = await apiClient.api.v1.timelines.public.$get({
      query: { local: "true" },
    });

    if (!response.ok) {
      throw new Error("Failed to load the local timeline.");
    }

    const statuses = await response.json();
    return statuses.map((status) => ({
      id: status.id,
      author: status.account.display_name || status.account.username,
      content: status.content,
      publishedAt: status.created_at,
      publishedLabel: formatPublishedLabel(status.created_at),
    }));
  },
};
