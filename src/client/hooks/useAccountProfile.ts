import { useEffect, useState } from "react";
import { getAccountStatuses, lookupAccount } from "../api/client";
import type { TimelinePost } from "../types/timeline";

type AccountProfile = {
  id: string;
  username: string;
  displayName: string;
  handle: string;
  summary: string;
  statusesCount: number;
  followersCount: number;
  followingCount: number;
  posts: TimelinePost[];
};

function formatPublishedLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function useAccountProfile(identifier: string) {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    lookupAccount(identifier)
      .then(async (account) => {
        const statuses = await getAccountStatuses(account.id);
        return {
          id: account.id,
          username: account.username,
          displayName: account.display_name || account.username,
          handle: account.acct,
          summary: account.note,
          statusesCount: account.statuses_count,
          followersCount: account.followers_count,
          followingCount: account.following_count,
          posts: statuses.map((status) => ({
            id: status.id,
            author: status.account.display_name || status.account.username,
            content: status.content,
            publishedAt: status.created_at,
            publishedLabel: formatPublishedLabel(status.created_at),
          })),
        } satisfies AccountProfile;
      })
      .then((nextProfile) => {
        if (!isMounted) return;
        setProfile(nextProfile);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!isMounted) return;
        setProfile(null);
        setError(cause instanceof Error ? cause.message : "Profile failed.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [identifier]);

  return { profile, isLoading, error };
}
