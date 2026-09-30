"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, Plus, X } from "lucide-react";
import { AppShell } from "@/components/taskflow-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWorkspaceStore } from "@/lib/workspace-store";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type ProjectStatus = "Planning" | "Active" | "On Hold" | "Completed";

interface ProjectFormValues {
  name: string;
  description: string;
  status: ProjectStatus;
  color: string; // Tailwind bg class from colorOptions
  dueDate: string; // yyyy-mm-dd, "" = no due date
  members: string; // kept as string while typing
}

/* -------------------------------------------------------------------------- */
/*                               Static options                               */
/* -------------------------------------------------------------------------- */

const statusOptions: ProjectStatus[] = [
  "Planning",
  "Active",
  "On Hold",
  "Completed",
];

// Full class names so Tailwind can see them at build time
const colorOptions: { name: string; className: string }[] = [
  { name: "Blue", className: "bg-blue-500" },
  { name: "Amber", className: "bg-amber-500" },
  { name: "Emerald", className: "bg-emerald-500" },
  { name: "Violet", className: "bg-violet-500" },
  { name: "Rose", className: "bg-rose-500" },
  { name: "Slate", className: "bg-slate-500" },
];

const fieldClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 [&>option]:bg-white [&>option]:text-black";

const formatDue = (dueDate: string, status: ProjectStatus): string => {
  if (status === "Completed") return "Completed";
  if (!dueDate) return "No due date";
  const [y, m, d] = dueDate.split("-").map(Number);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  if (y !== new Date().getFullYear()) options.year = "numeric";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", options);
};

// "Completed" and "No due date" read badly after "Due "
const dueLabel = (due: string) =>
  due === "Completed" || due === "No due date" ? due : `Due ${due}`;

/* -------------------------------------------------------------------------- */
/*                                 Mock data                                  */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                              New project dialog                            */
/* -------------------------------------------------------------------------- */

const emptyForm: ProjectFormValues = {
  name: "",
  description: "",
  status: "Planning",
  color: colorOptions[0].className,
  dueDate: "",
  members: "1",
};

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}

function ProjectDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (values: ProjectFormValues) => void;
}) {
  const [values, setValues] = useState<ProjectFormValues>(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const update = <K extends keyof ProjectFormValues>(
    key: K,
    value: ProjectFormValues[K],
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) {
      setError("Enter a name for the project.");
      return;
    }
    onCreate({ ...values, name: values.name.trim() });
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
        aria-labelledby="new-project-title"
        className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="new-project-title" className="text-xl font-semibold">
            Create New Project
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

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <Field label="Project Name" htmlFor="project-name">
            <input
              id="project-name"
              type="text"
              autoFocus
              value={values.name}
              onChange={(e) => {
                update("name", e.target.value);
                if (error) setError("");
              }}
              placeholder="Project name"
              aria-invalid={!!error}
              aria-describedby={error ? "project-name-error" : undefined}
              className={fieldClass}
            />
            {error && (
              <p id="project-name-error" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </Field>

          <Field label="Description" htmlFor="project-description">
            <textarea
              id="project-description"
              rows={3}
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="What is this project about?"
              className={`${fieldClass} h-auto resize-y py-2`}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="project-status">
              <select
                id="project-status"
                value={values.status}
                onChange={(e) =>
                  update("status", e.target.value as ProjectStatus)
                }
                className={fieldClass}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Color">
            <div
              role="radiogroup"
              aria-label="Project color"
              className="flex flex-wrap gap-3"
            >
              {colorOptions.map((c) => {
                const selected = values.color === c.className;
                return (
                  <button
                    key={c.className}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={c.name}
                    onClick={() => update("color", c.className)}
                    className={`size-8 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${c.className} ${
                      selected
                        ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                        : "opacity-80 hover:opacity-100"
                    }`}
                  />
                );
              })}
            </div>
          </Field>

          <Field label="Due Date" htmlFor="project-due-date">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-5 shrink-0 text-muted-foreground" />
              <input
                id="project-due-date"
                type="date"
                value={values.dueDate}
                onChange={(e) => update("dueDate", e.target.value)}
                className={fieldClass}
              />
            </div>
          </Field>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

export default function ProjectsPage() {
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const hydrated = useWorkspaceStore((state) => state.hydrated);
  const projects = useWorkspaceStore((state) => state.projects);
  const addProject = useWorkspaceStore((state) => state.addProject);
  const [dialogOpen, setDialogOpen] = useState(false);

  const workspaceProjects = activeWorkspaceId
    ? projects.filter((project) => project.workspaceId === activeWorkspaceId)
    : [];

  const handleCreateProject = (values: ProjectFormValues) => {
    if (!activeWorkspaceId) return;
    addProject({
      name: values.name,
      description: values.description.trim(),
      status: values.status,
      color: values.color,
      due: formatDue(values.dueDate, values.status),
      dueDate: values.dueDate,
      members: Math.max(1, Math.floor(Number(values.members)) || 1),
      workspaceId: activeWorkspaceId,
    });
    setDialogOpen(false);
  };

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

  if (!activeWorkspaceId) {
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

  return (
    <AppShell>
      <div className="flex flex-col gap-7">
        {/* Header Layout */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Workspace / Projects
            </p>
            <h1 className="mt-1 text-3xl font-semibold">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track progress across every active initiative.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className={buttonVariants({ variant: "default" })}
          >
            <Plus className="mr-2 size-4" />
            New Project
          </button>
        </div>

        {/* Responsive Grid System */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {workspaceProjects.map((project) => (
            <Link href={`/projects/${project.id}`} key={project.id}>
              <Card className="h-full transition hover:-translate-y-0.5 hover:border-primary/50 shadow-sm">
                <CardContent className="flex h-full flex-col gap-5 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2.5 shrink-0 rounded-full ${project.color}`}
                      />
                      <h2 className="font-semibold">{project.name}</h2>
                    </div>
                    <Badge variant="secondary">{project.status}</Badge>
                  </div>
                  <p className="flex-1 text-sm leading-6 text-muted-foreground">
                    {project.description || "No description"}
                  </p>
                  <div>
                    <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{dueLabel(project.due)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {dialogOpen && (
        <ProjectDialog
          onClose={() => setDialogOpen(false)}
          onCreate={handleCreateProject}
        />
      )}
    </AppShell>
  );
}
