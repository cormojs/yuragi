import { useEffect, useState } from "react";
import { timelineApi } from "../api/timelineApi";
import type { TimelinePost } from "../types/timeline";

export function useTimeline() {
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    timelineApi
      .getLocalTimeline()
      .then((nextPosts) => {
        if (!isMounted) return;
        setPosts(nextPosts);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!isMounted) return;
        setError(cause instanceof Error ? cause.message : "Timeline failed.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { posts, isLoading, error };
}
