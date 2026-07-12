import { useCallback, useEffect, useState } from "react";
import { getLocalTimeline } from "../api/client";
import type { TimelinePost } from "../types/timeline";

export function useTimeline() {
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const nextPosts = await getLocalTimeline();
      setPosts(nextPosts);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Timeline failed.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { posts, isLoading, error, reload };
}
