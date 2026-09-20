"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/lib/workspace-store";

const roleOptions = [
  "Developer",
  "Designer",
  "Product Manager",
  "QA Engineer",
  "Team Member",
];

const fieldClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 [&>option]:bg-white [&>option]:text-black";

interface Errors {
  name?: string;
  email?: string;
}

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

// Mount this only while open ({open && <InviteMemberDialog />}),
// so the form resets every time it opens
export function InviteMemberDialog({ onClose }: { onClose: () => void }) {
  const addMember = useWorkspaceStore((s) => s.addMember);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roleOptions[0]);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const next: Errors = {};
    if (!name.trim()) next.name = "Enter the member's name.";
    if (!email.trim()) next.email = "Enter an email address.";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      next.email = "Enter a valid email address.";

    if (next.name || next.email) {
      setErrors(next);
      return;
    }

    if (!activeWorkspaceId) {
      setErrors({ email: "No active workspace selected." });
      return;
    }

    const result = addMember({ workspaceId: activeWorkspaceId, name, email, role });
    if (!result.ok) {
      setErrors({ email: result.error });
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
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
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Full Name" htmlFor="member-name" error={errors.name}>
            <input
              id="member-name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
              }}
              placeholder="Full name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "member-name-error" : undefined}
              className={fieldClass}
            />
          </Field>

          <Field label="Email" htmlFor="member-email" error={errors.email}>
            <input
              id="member-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
              placeholder="name@company.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "member-email-error" : undefined}
              className={fieldClass}
            />
          </Field>

          <Field label="Role" htmlFor="member-role">
            <select
              id="member-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={fieldClass}
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Invite Member</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
