"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { startNavigationLoading } from "@/lib/navigation-loading";

export function InvitationActions({
  token,
  workspaceId,
  invitedEmail,
  signedInEmail,
}: {
  token: string;
  workspaceId: string;
  invitedEmail: string;
  signedInEmail: string;
}) {
  const router = useRouter();
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces);
  const setActiveWorkspace = useWorkspaceStore(
    (state) => state.setActiveWorkspace,
  );
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const emailMatches = signedInEmail.trim().toLowerCase() === invitedEmail.toLowerCase();

  const acceptInvitation = async () => {
    setError(null);
    setIsAccepting(true);
    try {
      const response = await fetch(`/api/invitations/${encodeURIComponent(token)}/accept`, {
        method: "POST",
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not accept this invitation.");
        return;
      }
      const workspacesLoaded = await fetchWorkspaces();
      if (
        !workspacesLoaded ||
        !useWorkspaceStore
          .getState()
          .workspaces.some((workspace) => workspace.id === workspaceId)
      ) {
        setError(
          "Invitation accepted, but workspace data could not be refreshed. Reload the page to continue.",
        );
        return;
      }
      setActiveWorkspace(workspaceId);
      startNavigationLoading();
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsAccepting(false);
    }
  };

  if (!emailMatches) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3">
        <p role="alert" className="text-sm text-destructive">
          You are signed in as {signedInEmail}. Sign in with {invitedEmail} to accept.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => signOut({ callbackUrl: `/invite/${encodeURIComponent(token)}` })}
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="button" onClick={acceptInvitation} disabled={isAccepting}>
        {isAccepting ? "Joining workspace..." : "Accept invitation"}
      </Button>
    </div>
  );
}
