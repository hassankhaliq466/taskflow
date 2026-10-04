"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Mail, MoreVertical, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/taskflow-shell";
import { InviteMemberDialog } from "@/components/invite-member-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaceStore, type Member } from "@/lib/workspace-store";

// Memoized: re-renders only when this member, their task count, or onDelete changes
const MemberCard = memo(function MemberCard({
  member,
  taskCount,
  onDelete,
  canDelete = false,
}: {
  member: Member;
  taskCount: number;
  onDelete: (id: string) => void;
  canDelete?: boolean;
}) {
  return (
    <Card className="relative h-full">
      {canDelete && (
        <>
          {/* Three Dots Menu */}
          <div className="absolute right-3 top-3 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                  >
                    <MoreVertical className="size-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onDelete(member.id)}
                  className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}

      <CardContent className="flex h-full flex-col items-center p-6 text-center">
        <Avatar className="size-16">
          <AvatarFallback className="bg-primary/10 text-primary">
            {member.initials}
          </AvatarFallback>
        </Avatar>
        <h2 className="mt-4 font-semibold">{member.name}</h2>
        <p className="mt-1 text-sm text-primary">{member.role}</p>
        <a
          href={`mailto:${member.email}`}
          title={member.email}
          className="mt-3 flex max-w-full items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground hover:underline"
        >
          <Mail className="size-3.5 shrink-0" />
          <span className="truncate">{member.email}</span>
        </a>
        <div className="mt-auto w-full pt-5">
          <div className="rounded-lg bg-muted/60 p-3 text-left">
            <p className="text-xs text-muted-foreground">Assigned tasks</p>
            <p className="mt-1 text-xl font-semibold">{taskCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Owns the dialog state, so opening or closing it doesn't re-render the grid
function InviteMemberButton() {
  const [open, setOpen] = useState(false);
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Invite member
      </Button>
      {open && <InviteMemberDialog onClose={handleClose} />}
    </>
  );
}

export default function TeamPage() {
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const members = useWorkspaceStore((s) => s.members);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const projects = useWorkspaceStore((s) => s.projects);
  const deleteMember = useWorkspaceStore((s) => s.deleteMember);
  const currentWorkspaceRole = useWorkspaceStore((s) => s.currentWorkspaceRole);
  const currentUserId = useWorkspaceStore((s) => s.currentUserId);

  const handleDeleteMember = useCallback(
    (memberId: string) => {
      if (activeWorkspaceId) deleteMember(memberId, activeWorkspaceId);
    },
    [deleteMember, activeWorkspaceId]
  );

  const workspaceMembers = useMemo(
    () =>
      members.filter((member) => member.workspaceId === activeWorkspaceId),
    [members, activeWorkspaceId]
  );

  const workspaceProjects = useMemo(
    () =>
      projects.filter((project) => project.workspaceId === activeWorkspaceId),
    [projects, activeWorkspaceId]
  );

  // Only count tasks for projects in the active workspace
  const projectIds = useMemo(
    () => new Set(workspaceProjects.map((project) => project.id)),
    [workspaceProjects]
  );

  // Live counts from the project store, so they can't drift out of sync
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of tasks) {
      if (task.assigneeId && projectIds.has(task.projectId)) {
        counts[task.assigneeId] = (counts[task.assigneeId] ?? 0) + 1;
      }
    }
    return counts;
  }, [tasks, projectIds]);

  const isWorkspaceAdmin = currentWorkspaceRole === "admin" || currentWorkspaceRole === "owner";

  return (
    <AppShell>
      <div className="flex flex-col gap-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Workspace / Team</p>
            <h1 className="mt-1 text-3xl font-semibold">Team members</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Everyone working across your projects.
            </p>
          </div>
          {isWorkspaceAdmin && <InviteMemberButton />}
        </div>

        {/* Wait for saved members to load so seed data doesn't flash first */}
        {hydrated &&
          (workspaceMembers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
              No team members yet. Click Invite member to add the first one.
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {workspaceMembers.map((member) => (
                <li key={member.id}>
                  <MemberCard
                    member={member}
                    taskCount={taskCounts[member.id] ?? 0}
                    onDelete={handleDeleteMember}
                    canDelete={isWorkspaceAdmin && currentUserId !== member.id && member.role !== "owner"}
                  />
                </li>
              ))}
            </ul>
          ))}
      </div>
    </AppShell>
  );
}