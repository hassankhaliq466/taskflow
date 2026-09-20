import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  FolderKanban,
  Plus,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/taskflow-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// --- MOCK DATA SETUP ---
interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  color: string;
  progress: number;
  due: string;
  members: number;
}

interface Task {
  id: string;
  projectId: string;
  title: string;
  status: "done" | "in-progress" | "todo";
  priority: string;
}

const mockProjects: Project[] = [
  {
    id: "website-redesign",
    name: "Website Redesign",
    description: "Upgrade the core landing page to Next.js App Router.",
    status: "Active",
    color: "bg-blue-500",
    progress: 75,
    due: "Due Jun 25",
    members: 4,
  },
  {
    id: "mobile-app",
    name: "Mobile App v2",
    description: "Rebuilding the mobile check-out flow interface.",
    status: "Planning",
    color: "bg-amber-500",
    progress: 20,
    due: "Due Jul 12",
    members: 3,
  },
];

const mockTasks: Task[] = [
  { id: "task-1", projectId: "website-redesign", title: "Finalize header alignment", status: "done", priority: "High" },
  { id: "task-2", projectId: "website-redesign", title: "Review UI/UX layouts", status: "in-progress", priority: "Medium" },
  { id: "task-3", projectId: "mobile-app", title: "Setup push providers", status: "todo", priority: "Low" },
];

export default function DashboardPage() {
  // Filter for tasks tied specifically to the redesign project
  const websiteTasks = mockTasks.filter((t) => t.projectId === "website-redesign");

  const stats = [
    {
      label: "Total Projects",
      value: mockProjects.length,
      caption: "Across your workspace",
      icon: FolderKanban,
    },
    {
      label: "Completed Tasks",
      value: mockTasks.filter((t) => t.status === "done").length,
      caption: "This week",
      icon: Check,
    },
    { label: "Team Members", value: 12, caption: "Across all projects", icon: Users },
    {
      label: "Open Tasks",
      value: mockTasks.filter((t) => t.status !== "done").length,
      caption: "Need your attention",
      icon: ArrowUpRight,
    },
  ];

  return (
    <AppShell>
      <div className="flex flex-col gap-7">
        {/* Header Section */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-primary">
              Monday, June 17, 2024
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
            className={buttonVariants({ variant: "default", className: "px-3" })}
          >
            <Plus className="mr-2 size-4" />
            New Project
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, caption, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-3xl font-semibold">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Project Overview Card */}
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
            {mockProjects.map((project) => {
              const relatedTasks = mockTasks.filter((t) => t.projectId === project.id);
              // Simplified progress evaluation logic falling back onto initial baseline values
              const progress = relatedTasks.length 
                ? Math.round((relatedTasks.filter(t => t.status === "done").length / relatedTasks.length) * 100) 
                : project.progress;

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="rounded-xl border border-border/70 p-4 transition hover:border-primary/50 hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${project.color}`} />
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
                    {project.members} members
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Tasks and Deadlines Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>My Tasks</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {websiteTasks.map((task) => (
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
                    />{" "}
                    <span className="text-sm">{task.title}</span>
                  </span>
                  <Badge variant="secondary">{task.priority}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Upcoming deadlines</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between border-b pb-3">
                <span>Finalize homepage copy</span>
                <span className="text-muted-foreground">Jun 19</span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span>Review mobile wireframes</span>
                <span className="text-muted-foreground">Jun 21</span>
              </div>
              <div className="flex justify-between">
                <span>Prepare launch checklist</span>
                <span className="text-muted-foreground">Jun 23</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
