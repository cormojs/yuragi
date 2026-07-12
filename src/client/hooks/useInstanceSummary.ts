import { useEffect, useState } from "react";
import { getInstanceSummary } from "../api/client";

const fallbackInstance = {
  name: "yuragi",
  description: "A small Fediverse SNS server built with Bun, Hono, and Fedify.",
};

export function useInstanceSummary() {
  const [instance, setInstance] = useState(fallbackInstance);

  useEffect(() => {
    async function loadInstanceSummary() {
      try {
        setInstance(await getInstanceSummary());
      } catch {
        // Keep the fallback instance summary.
      }
    }

    void loadInstanceSummary();
  }, []);

  return instance;
}
