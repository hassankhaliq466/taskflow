"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/lib/workspace-store";

// Renders nothing. Loads saved data from localStorage once the app has
// mounted, so server and client HTML match on first render.
export function StoreHydrator() {
  useEffect(() => {
    useWorkspaceStore.persist.rehydrate();
  }, []);

  return null;
}