"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { AppShell } from "@/components/taskflow-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const profile = useWorkspaceStore((state) => state.profile);
  const {
    workspaces,
    activeWorkspaceId,
    updateWorkspace,
    updateCurrentUserProfile,
    deleteWorkspace,
  } = useWorkspaceStore();
  const active =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    workspaces[0] ??
    null;

  const [workspaceName, setWorkspaceName] = useState(active?.name ?? "");
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setProfileName(profile?.name ?? session?.user?.name ?? "");
    setProfileEmail(profile?.email ?? session?.user?.email ?? "");
  }, [
    profile?.email,
    profile?.name,
    session?.user?.email,
    session?.user?.name,
  ]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName, email: profileEmail }),
      });
      const result = (await response.json()) as {
        error?: string;
        user?: { name: string; email: string };
      };

      if (!response.ok) {
        toast.error(result.error ?? "Could not update your profile.");
        return;
      }

      if (result.user) {
        setProfileName(result.user.name);
        setProfileEmail(result.user.email);
        updateCurrentUserProfile(result.user);
        await updateSession(result.user);
      }
      toast.success("Profile updated");
    } catch {
      toast.error("Could not update your profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSave = () => {
    if (!active) {
      toast.error("Create a workspace before saving settings.");
      return;
    }

    const trimmed = workspaceName.trim();
    if (!trimmed) {
      toast.error("Workspace name cannot be empty.");
      return;
    }

    updateWorkspace(active.id, { name: trimmed });
    toast.success("Settings saved");
    router.refresh();
  };

  useEffect(() => {
    if (!deleteDialogOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDeleteDialogOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteDialogOpen]);

  const handleRequestDeleteWorkspace = () => {
    if (!active) {
      toast.error("Select a workspace before deleting.");
      return;
    }

    setDeleteDialogOpen(true);
  };

  const handleDeleteWorkspace = () => {
    if (!active) return;

    deleteWorkspace(active.id);
    setDeleteDialogOpen(false);
    toast.success(`Workspace "${active.name}" deleted`);
    router.push("/");
  };

  return (
    <AppShell>
      <div className="flex max-w-3xl flex-col gap-7">
        <div>
          <p className="text-sm text-muted-foreground">Workspace / Settings</p>
          <h1 className="mt-1 text-3xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your profile, workspace, and notifications.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <label className="flex max-w-md flex-col gap-2 text-sm font-medium">
              Name
              <Input
                autoComplete="name"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
              />
            </label>
            <label className="flex max-w-md flex-col gap-2 text-sm font-medium">
              Email
              <Input
                type="email"
                autoComplete="email"
                value={profileEmail}
                onChange={(event) => setProfileEmail(event.target.value)}
              />
            </label>
            <Button
              className="self-start"
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? "Saving..." : "Save profile"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex max-w-md flex-col gap-2 text-sm font-medium">
              Workspace name
              <Input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
              />
            </label>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <label className="flex items-center justify-between gap-4 text-sm">
              <span>
                <span className="block font-medium">Email updates</span>
                <span className="text-xs text-muted-foreground">
                  Receive summaries about project activity.
                </span>
              </span>
              <input
                type="checkbox"
                checked={emailUpdates}
                onChange={(e) => setEmailUpdates(e.target.checked)}
                className="size-4 accent-primary"
              />
            </label>
            <label className="flex items-center justify-between gap-4 text-sm">
              <span>
                <span className="block font-medium">Mentions</span>
                <span className="text-xs text-muted-foreground">
                  Get notified when someone mentions you.
                </span>
              </span>
              <input
                type="checkbox"
                checked={mentions}
                onChange={(e) => setMentions(e.target.checked)}
                className="size-4 accent-primary"
              />
            </label>
          </CardContent>
        </Card>
        <div className="flex justify-start gap-4">
          <Button className="self-start" onClick={handleSave}>
            Save changes
          </Button>
          <Button
            className="self-start bg-red-500 text-white hover:bg-red-600"
            variant="destructive"
            onClick={handleRequestDeleteWorkspace}
          >
            Delete workspace
          </Button>
        </div>
      </div>
      {deleteDialogOpen && active && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDeleteDialogOpen(false);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-workspace-title"
            aria-describedby="delete-workspace-description"
            className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 id="delete-workspace-title" className="text-lg font-semibold">
                Delete workspace?
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close confirmation"
                onClick={() => setDeleteDialogOpen(false)}
              >
                <X />
              </Button>
            </div>
            <p
              id="delete-workspace-description"
              className="text-sm text-muted-foreground"
            >
              <span className="font-medium text-foreground">{active.name}</span>{" "}
              and its projects, tasks, and team members will be permanently
              deleted. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                autoFocus
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteWorkspace}
              >
                Delete workspace
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}