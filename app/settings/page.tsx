"use client";
import { useState } from "react";
import { AppShell } from "@/components/taskflow-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { workspaces, activeWorkspaceId, updateWorkspace } = useWorkspaceStore();
  const active =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    workspaces[0] ??
    null;

  const [name, setName] = useState("Jordan Davis");
  const [workspaceName, setWorkspaceName] = useState(active?.name ?? "");
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [mentions, setMentions] = useState(true);

  const router = useRouter();

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
    router.push(`/dashboard`);
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
            <CardTitle>Profile information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Full name
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Email
              <Input value="jordan@acme.co" readOnly />
            </label>
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
        <Button className="self-start" onClick={handleSave}>
          Save changes
        </Button>
      </div>
    </AppShell>
  );
}