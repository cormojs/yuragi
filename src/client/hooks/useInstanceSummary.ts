import { useEffect, useState } from "react";
import { getInstanceSummary } from "../api/instanceApi";
import { instanceStore } from "../stores/instanceStore";

export function useInstanceSummary() {
  const [instance, setInstance] = useState(instanceStore.instance);

  useEffect(() => {
    let isMounted = true;

    getInstanceSummary()
      .then((nextInstance) => {
        if (!isMounted) return;
        setInstance(nextInstance);
      })
      .catch(() => {
        if (!isMounted) return;
        setInstance(instanceStore.instance);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return instance;
}
