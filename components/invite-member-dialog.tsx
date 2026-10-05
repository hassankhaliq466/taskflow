"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/lib/workspace-store";

export const roleOptions = [
  "Developer",
  "Designer",
  "Product Manager",
  "QA Engineer",
  "Team Member",
];

const fieldClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 [&>option]:bg-white [&>option]:text-black";

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function InviteMemberDialog({ onClose }: { onClose: () => void }) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSubmitting, onClose]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!activeWorkspaceId) {
      setError("No active workspace selected.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/workspaces/${activeWorkspaceId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, role }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not send the invitation.");
        return;
      }
      setSentTo(normalizedEmail);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-member-title"
        className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="invite-member-title" className="text-xl font-semibold">
            Invite Member
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        {sentTo ? (
          <div className="flex flex-col gap-5">
            <p role="status" className="text-sm text-muted-foreground">
              Invitation sent to <span className="font-medium text-foreground">{sentTo}</span>.
              They can join the workspace using the link in the email.
            </p>
            <div className="flex justify-end">
              <Button type="button" onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Field label="Email" htmlFor="member-email" error={error ?? undefined}>
              <input
                id="member-email"
                type="email"
                autoFocus
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(null);
                }}
                placeholder="name@company.com"
                aria-invalid={!!error}
                aria-describedby={error ? "member-email-error" : undefined}
                className={fieldClass}
                disabled={isSubmitting}
              />
            </Field>

            <Field label="Workspace access" htmlFor="member-role">
              <select
                id="member-role"
                value={role}
                onChange={(event) => setRole(event.target.value as "admin" | "member")}
                className={fieldClass}
                disabled={isSubmitting}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </Field>

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send invitation"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
