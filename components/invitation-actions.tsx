"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function InvitationActions({
  token,
  invitedEmail,
  signedInEmail,
}: {
  token: string;
  invitedEmail: string;
  signedInEmail: string;
}) {
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
      window.location.assign("/dashboard");
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
