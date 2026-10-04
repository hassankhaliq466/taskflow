"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useWorkspaceStore } from "@/lib/workspace-store";

// Fetches initial data on mount. Replaces the old localStorage rehydration.
export function StoreHydrator() {
  const { data: session, status } = useSession();
  const fetchWorkspaces = useWorkspaceStore((s) => s.fetchWorkspaces);
  const fetchWorkspaceMembers = useWorkspaceStore((s) => s.fetchWorkspaceMembers);
  const fetchProjects = useWorkspaceStore((s) => s.fetchProjects);
  const fetchProjectMembers = useWorkspaceStore((s) => s.fetchProjectMembers);
  const fetchTasks = useWorkspaceStore((s) => s.fetchTasks);
  const setCurrentUser = useWorkspaceStore((s) => s.setCurrentUser);
  const updateCurrentUserProfile = useWorkspaceStore(
    (s) => s.updateCurrentUserProfile,
  );
  const setHydrated = useWorkspaceStore((s) => s.setHydrated);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspacesLoaded = useWorkspaceStore((s) => s.workspacesLoaded);
  const currentUserId = status === "authenticated" ? session?.user?.id ?? null : null;

  useEffect(() => {
    if (status !== "loading") {
      setCurrentUser(currentUserId);
    }
  }, [currentUserId, setCurrentUser, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    updateCurrentUserProfile({
      name: session.user.name ?? "",
      email: session.user.email ?? "",
    });
  }, [
    session?.user?.email,
    session?.user?.name,
    status,
    updateCurrentUserProfile,
  ]);

  useEffect(() => {
    if (status !== "authenticated" || !currentUserId || workspacesLoaded) return;
    void fetchWorkspaces();
  }, [currentUserId, fetchWorkspaces, status, workspacesLoaded]);

  useEffect(() => {
    if (status !== "authenticated" || !workspacesLoaded) return;
    if (!activeWorkspaceId) {
      setHydrated();
      return;
    }

    let cancelled = false;
    const loadWorkspace = async () => {
      try {
        await Promise.all([
          fetchWorkspaceMembers(activeWorkspaceId),
          fetchProjects(activeWorkspaceId),
        ]);
        if (cancelled) return;

        const projects = useWorkspaceStore
          .getState()
          .projects.filter((project) => project.workspaceId === activeWorkspaceId);
        await Promise.all(
          projects.flatMap((project) => [
            fetchTasks(project.id),
            fetchProjectMembers(project.id),
          ]),
        );
      } finally {
        if (!cancelled) setHydrated();
      }
    };

    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [
    activeWorkspaceId,
    fetchProjectMembers,
    fetchProjects,
    fetchTasks,
    fetchWorkspaceMembers,
    setHydrated,
    status,
    workspacesLoaded,
  ]);

  return null;
}