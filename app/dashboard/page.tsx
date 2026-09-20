"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  FolderKanban,
  Plus,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { AppShell } from "@/components/taskflow-shell";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function DashboardPage() {
  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );
  const hydrated = useWorkspaceStore((state) => state.hydrated);
  const projects = useWorkspaceStore((state) => state.projects);
  const tasks = useWorkspaceStore((state) => state.tasks);
  const members = useWorkspaceStore((state) => state.members);
  const workspaces = useWorkspaceStore((state) => state.workspaces);

  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === activeWorkspaceId,
  );

  /*
   * Everything below is derived from the active workspace.
   *
   * Projects are filtered by workspaceId.
   * Tasks are then filtered through those projects.
   * Members are filtered by workspaceId.
   *
   * This means changing the workspace in AppShell automatically causes
   * this page to recalculate and display that workspace's data.
   */
  const workspaceProjects = useMemo(
    () =>
      activeWorkspaceId
        ? projects.filter(
            (project) => project.workspaceId === activeWorkspaceId,
          )
        : [],
    [projects, activeWorkspaceId],
  );

  const workspaceProjectIds = useMemo(
    () => new Set(workspaceProjects.map((project) => project.id)),
    [workspaceProjects],
  );

  const workspaceTasks = useMemo(
    () =>
      tasks.filter((task) => workspaceProjectIds.has(task.projectId)),
    [tasks, workspaceProjectIds],
  );

  const workspaceMembers = useMemo(
    () =>
      activeWorkspaceId
        ? members.filter(
            (member) => member.workspaceId === activeWorkspaceId,
          )
        : [],
    [members, activeWorkspaceId],
  );

  const completedTasks = workspaceTasks.filter(
    (task) => task.status === "done",
  );

  const openTasks = workspaceTasks.filter(
    (task) => task.status !== "done",
  );

  const myTasks = workspaceTasks.filter((task) => task.assigneeId !== null);

  if (!hydrated) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Loading your workspace...
          </p>
        </div>
      </AppShell>
    );
  }

  if (!activeWorkspace) {
    // AppShell owns the create-workspace modal. This prevents the dashboard
    // from showing fake data while the user has no workspace.
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-semibold">Create your workspace</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a workspace to start managing your projects.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  const stats = [
    {
      label: "Total Projects",
      value: workspaceProjects.length,
      caption: `In ${activeWorkspace.name}`,
      icon: FolderKanban,
    },
    {
      label: "Completed Tasks",
      value: completedTasks.length,
      caption: "Across this workspace",
      icon: Check,
    },
    {
      label: "Team Members",
      value: workspaceMembers.length,
      caption: "In this workspace",
      icon: Users,
    },
    {
      label: "Open Tasks",
      value: openTasks.length,
      caption: "Need your attention",
      icon: ArrowUpRight,
    },
  ];

  return (
    <AppShell>
      <div className="flex flex-col gap-7">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-primary">
              {activeWorkspace.name}
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Welcome back, Jordan
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening with your projects today.
            </p>
          </div>

          <Link
            href="/projects"
            className={buttonVariants({
              variant: "default",
              className: "px-3",
            })}
          >
            <Plus className="mr-2 size-4" />
            New Project
          </Link>
        </div>

        {/* Workspace Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, caption, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-3xl font-semibold">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {caption}
                  </p>
                </div>

                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Project Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Project Overview</CardTitle>

            <Link
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              href="/projects"
            >
              <span>View all</span>
              <ArrowUpRight className="size-4" />
            </Link>
          </CardHeader>

          <CardContent className="grid gap-4 lg:grid-cols-3">
            {workspaceProjects.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground lg:col-span-3">
                No projects in this workspace yet.
              </div>
            ) : (
              workspaceProjects.map((project) => {
                const relatedTasks = workspaceTasks.filter(
                  (task) => task.projectId === project.id,
                );

                const progress = relatedTasks.length
                  ? Math.round(
                      (relatedTasks.filter(
                        (task) => task.status === "done",
                      ).length /
                        relatedTasks.length) *
                        100,
                    )
                  : project.progress;

                const projectMemberIds = new Set(
                  relatedTasks
                    .map((task) => task.assigneeId)
                    .filter(Boolean),
                );

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="rounded-xl border border-border/70 p-4 transition hover:border-primary/50 hover:bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full ${project.color}`}
                          />
                          <h3 className="font-semibold">{project.name}</h3>
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground">
                          {project.description}
                        </p>
                      </div>

                      <Badge variant="secondary">{project.status}</Badge>
                    </div>

                    <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{progress}% complete</span>
                      <span>{project.due}</span>
                    </div>

                    <Progress value={progress} className="mt-2" />

                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="size-3.5" />
                      {projectMemberIds.size} members assigned
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Tasks and Deadlines */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>My Tasks</CardTitle>
            </CardHeader>

            <CardContent className="flex flex-col gap-3">
              {myTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No assigned tasks in this workspace.
                </p>
              ) : (
                myTasks.slice(0, 5).map((task) => (
                  <Link
                    href={`/projects/${task.projectId}?task=${task.id}`}
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/40"
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`size-2 rounded-full ${
                          task.status === "done"
                            ? "bg-emerald-500"
                            : task.status === "in-progress"
                              ? "bg-amber-500"
                              : "bg-muted-foreground/40"
                        }`}
                      />

                      <span className="text-sm">{task.title}</span>
                    </span>

                    <Badge variant="secondary">{task.priority}</Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming deadlines</CardTitle>
            </CardHeader>

            <CardContent className="flex flex-col gap-3 text-sm">
              {workspaceTasks.filter((task) => task.dueDate).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No upcoming deadlines.
                </p>
              ) : (
                workspaceTasks
                  .filter((task) => task.dueDate)
                  .sort(
                    (a, b) =>
                      new Date(a.dueDate!).getTime() -
                      new Date(b.dueDate!).getTime(),
                  )
                  .slice(0, 5)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="flex justify-between border-b pb-3 last:border-b-0"
                    >
                      <span>{task.title}</span>
                      <span className="text-muted-foreground">
                        {task.dueDate}
                      </span>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
