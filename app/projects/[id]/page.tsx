"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Bug,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Square,
  Trash2,
  X,
  Zap,
} from "lucide-react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/taskflow-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useWorkspaceStore,
  type Priority,
  type Status,
  type Task,
  type TaskType,
  type Member,
} from "@/lib/workspace-store";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface TaskFormValues {
  title: string;
  description: string;
  type: TaskType;
  priority: Priority;
  assigneeId: string; // "" = unassigned
  status: Status;
  dueDate: string; // "" = no due date
}

/* -------------------------------------------------------------------------- */
/*                               Static options                               */
/* -------------------------------------------------------------------------- */

const statusOptions: { value: Status; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const typeOptions: { value: TaskType; label: string }[] = [
  { value: "task", label: "Task" },
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
];

const priorityOptions: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const typeStyles: Record<TaskType, { icon: ReactNode; className: string }> = {
  task: {
    icon: <Square className="size-3.5" />,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  bug: {
    icon: <Bug className="size-3.5" />,
    className: "text-red-600 dark:text-red-400",
  },
  feature: {
    icon: <Sparkles className="size-3.5" />,
    className: "text-violet-600 dark:text-violet-400",
  },
};

const priorityStyles: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  high: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const tabs = ["Tasks", "Settings"];

const getLabel = (
  options: { value: string; label: string }[],
  value: string,
) => options.find((o) => o.value === value)?.label ?? value;

const formatDueDate = (value: string | null) => {
  if (!value) return "No due date";
  const [y, m, d] = value.split("-").map(Number);
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
  if (y !== new Date().getFullYear()) options.year = "numeric";
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", options);
};

const fieldClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 [&>option]:bg-white [&>option]:text-black";

const filterSelectClass =
  "h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 [&>option]:bg-white [&>option]:text-black";

/* -------------------------------------------------------------------------- */
/*                               Small components                             */
/* -------------------------------------------------------------------------- */

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
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

function StatCard({
  label,
  value,
  iconClass,
}: {
  label: string;
  value: number;
  iconClass: string;
}) {
  return (
    <Card className="border border-border/70 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Zap className={`size-4 ${iconClass}`} />
        </div>
        <p className={`mt-1 text-2xl font-semibold ${iconClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                              New / edit task dialog                        */
/* -------------------------------------------------------------------------- */

const emptyForm: TaskFormValues = {
  title: "",
  description: "",
  type: "task",
  priority: "medium",
  assigneeId: "",
  status: "todo",
  dueDate: "",
};

function TaskDialog({
  members,
  initialValues,
  onClose,
  onSubmit,
}: {
  members: Member[];
  initialValues?: TaskFormValues; // present = edit mode
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
}) {
  const isEditing = !!initialValues;
  const [values, setValues] = useState<TaskFormValues>(
    initialValues ?? emptyForm,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const update = <K extends keyof TaskFormValues>(
    key: K,
    value: TaskFormValues[K],
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) {
      setError("Enter a title for the task.");
      return;
    }
    onSubmit({ ...values, title: values.title.trim() });
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
        aria-labelledby="new-task-title"
        className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="new-task-title" className="text-xl font-semibold">
            {isEditing ? "Edit Task" : "Create New Task"}
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
          <Field label="Title" htmlFor="task-title">
            <input
              id="task-title"
              type="text"
              autoFocus
              value={values.title}
              onChange={(e) => {
                update("title", e.target.value);
                if (error) setError("");
              }}
              placeholder="Task title"
              aria-invalid={!!error}
              aria-describedby={error ? "task-title-error" : undefined}
              className={fieldClass}
            />
            {error && (
              <p id="task-title-error" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </Field>

          <Field label="Description" htmlFor="task-description">
            <textarea
              id="task-description"
              rows={4}
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Describe the task"
              className={`${fieldClass} h-auto resize-y py-2`}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="task-type">
              <select
                id="task-type"
                value={values.type}
                onChange={(e) => update("type", e.target.value as TaskType)}
                className={fieldClass}
              >
                {typeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Priority" htmlFor="task-priority">
              <select
                id="task-priority"
                value={values.priority}
                onChange={(e) => update("priority", e.target.value as Priority)}
                className={fieldClass}
              >
                {priorityOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Assignee" htmlFor="task-assignee">
              <select
                id="task-assignee"
                value={values.assigneeId}
                onChange={(e) => update("assigneeId", e.target.value)}
                className={fieldClass}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status" htmlFor="task-status">
              <select
                id="task-status"
                value={values.status}
                onChange={(e) => update("status", e.target.value as Status)}
                className={fieldClass}
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Due Date" htmlFor="task-due-date">
            <input
              id="task-due-date"
              type="date"
              value={values.dueDate}
              onChange={(e) => update("dueDate", e.target.value)}
              className={fieldClass}
            />
          </Field>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  // Shared store: select data and actions individually
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const project = useWorkspaceStore((s) =>
    s.projects.find((p) => p.id === id && p.workspaceId === s.activeWorkspaceId)
  );
  const allTasks = useWorkspaceStore((s) => s.tasks);
  const members = useWorkspaceStore((s) => s.members);
  const addTask = useWorkspaceStore((s) => s.addTask);
  const updateTask = useWorkspaceStore((s) => s.updateTask);
  const deleteTask = useWorkspaceStore((s) => s.deleteTask);

  const workspaceMembers = useMemo(
    () => members.filter((m) => m.workspaceId === activeWorkspaceId),
    [members, activeWorkspaceId],
  );

  const [tab, setTab] = useState<string>("Tasks");
  // null = closed, "create" = new task, Task = editing that task
  const [dialog, setDialog] = useState<null | "create" | Task>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | TaskType>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all"); // "all" | "unassigned" | member id

  // Filter in useMemo, not inside the selector (a selector that returns a
  // new array every call can cause an infinite render loop)
  const projectTasks = useMemo(
    () => allTasks.filter((t) => t.projectId === id),
    [allTasks, id],
  );

  // Wait for saved data to load before deciding the project doesn't exist,
  // otherwise a refresh on a new project's page would redirect away
  useEffect(() => {
    if (hydrated && !project) router.replace("/projects");
  }, [hydrated, project, router]);

  if (!hydrated || !project) return null;

  const visibleTasks = projectTasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (assigneeFilter === "unassigned" && t.assigneeId !== null) return false;
    if (
      assigneeFilter !== "all" &&
      assigneeFilter !== "unassigned" &&
      t.assigneeId !== assigneeFilter
    )
      return false;
    return true;
  });

  const completedCount = projectTasks.filter((t) => t.status === "done").length;
  const inProgressCount = projectTasks.filter(
    (t) => t.status === "in-progress",
  ).length;

  const memberName = (memberId: string | null) =>
    workspaceMembers.find((m) => m.id === memberId)?.name ?? null;

  const handleCreateTask = (values: TaskFormValues) => {
    addTask({
      projectId: project.id,
      title: values.title,
      description: values.description.trim(),
      type: values.type,
      priority: values.priority,
      status: values.status,
      assigneeId: values.assigneeId || null,
      dueDate: values.dueDate || null,
    });
    setDialog(null);
  };

  const handleUpdateTask = (taskId: string, values: TaskFormValues) => {
    updateTask(taskId, {
      title: values.title,
      description: values.description.trim(),
      type: values.type,
      priority: values.priority,
      status: values.status,
      assigneeId: values.assigneeId || null,
      dueDate: values.dueDate || null,
    });
    setDialog(null);
  };

  const handleStatusChange = (taskId: string, status: Status) => {
    updateTask(taskId, { status });
  };

  const handleTaskDelete = (taskId: string) => {
    deleteTask(taskId);
  };

  const hasActiveFilters =
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    priorityFilter !== "all" ||
    assigneeFilter !== "all";

  const clearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setPriorityFilter("all");
    setAssigneeFilter("all");
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              aria-label="Back to projects"
              className="rounded-md p-1 text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium uppercase text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {project.status}
            </span>
          </div>
          <Button onClick={() => setDialog("create")}>
            <Plus className="size-4" />
            <span>New Task</span>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Tasks"
            value={projectTasks.length}
            iconClass="text-foreground"
          />
          <StatCard
            label="Completed"
            value={completedCount}
            iconClass="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label="In Progress"
            value={inProgressCount}
            iconClass="text-amber-600 dark:text-amber-400"
          />
          <StatCard
            label="Team Members"
            value={workspaceMembers.length}
            iconClass="text-blue-600 dark:text-blue-400"
          />
        </div>

        {/* Tabs */}
        <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-1">
          {tabs.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              aria-pressed={tab === name}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === name
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {tab !== "Tasks" && (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            {tab} isn&apos;t built yet.
          </div>
        )}

        {tab === "Tasks" && (
          <div className="flex flex-col gap-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | Status)
                }
                className={filterSelectClass}
              >
                <option value="all">All Statuses</option>
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by type"
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as "all" | TaskType)
                }
                className={filterSelectClass}
              >
                <option value="all">All Types</option>
                {typeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by priority"
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(e.target.value as "all" | Priority)
                }
                className={filterSelectClass}
              >
                <option value="all">All Priorities</option>
                {priorityOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by assignee"
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className={filterSelectClass}
              >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                {workspaceMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Task table */}
            <Card className="overflow-hidden border border-border/70 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs font-semibold uppercase text-muted-foreground">
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Assignee</th>
                        <th className="px-4 py-3">Due Date</th>
                        <th className="w-12 px-4 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {visibleTasks.map((task) => {
                        const assignee = memberName(task.assigneeId);
                        const typeStyle = typeStyles[task.type];
                        return (
                          <tr key={task.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <p className="font-medium">{task.title}</p>
                              {task.description && (
                                <p className="mt-0.5 line-clamp-1 max-w-sm text-xs text-muted-foreground">
                                  {task.description}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1.5 text-xs font-medium uppercase ${typeStyle.className}`}
                              >
                                {typeStyle.icon}
                                {getLabel(typeOptions, task.type)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-md px-2 py-1 text-xs font-medium uppercase ${priorityStyles[task.priority]}`}
                              >
                                {getLabel(priorityOptions, task.priority)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                aria-label={`Status for ${task.title}`}
                                value={task.status}
                                onChange={(e) =>
                                  handleStatusChange(
                                    task.id,
                                    e.target.value as Status,
                                  )
                                }
                                className="h-8 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none transition hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 [&>option]:bg-white [&>option]:text-black"
                              >
                                {statusOptions.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              {assignee ? (
                                <span className="inline-flex items-center gap-2">
                                  <Avatar name={assignee} />
                                  {assignee}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Unassigned
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={
                                  task.dueDate ? "" : "text-muted-foreground"
                                }
                              >
                                {formatDueDate(task.dueDate)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-7 text-muted-foreground hover:text-foreground focus:outline-none"
                                      aria-label={`Options for ${task.title}`}
                                    >
                                      <MoreHorizontal className="size-4" />
                                    </Button>
                                  }
                                ></DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-40 rounded-lg p-1"
                                >
                                  <DropdownMenuItem
                                    onClick={() => setDialog(task)}
                                    className="cursor-pointer gap-2 rounded-md text-xs font-medium"
                                  >
                                    <Pencil className="size-3.5" />
                                    <span>Edit Task</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleTaskDelete(task.id)}
                                    className="cursor-pointer gap-2 rounded-md text-xs font-medium text-destructive focus:bg-destructive/10 focus:text-destructive"
                                  >
                                    <Trash2 className="size-3.5" />
                                    <span>Delete Task</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {visibleTasks.length === 0 && (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    {projectTasks.length === 0
                      ? "No tasks yet. Click New Task to add the first one."
                      : "No tasks match these filters."}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {dialog && (
        <TaskDialog
          key={dialog === "create" ? "create" : dialog.id}
          members={workspaceMembers}
          initialValues={
            dialog === "create"
              ? undefined
              : {
                  title: dialog.title,
                  description: dialog.description,
                  type: dialog.type,
                  priority: dialog.priority,
                  assigneeId: dialog.assigneeId ?? "",
                  status: dialog.status,
                  dueDate: dialog.dueDate ?? "",
                }
          }
          onClose={() => setDialog(null)}
          onSubmit={
            dialog === "create"
              ? handleCreateTask
              : (values) => handleUpdateTask(dialog.id, values)
          }
        />
      )}
    </AppShell>
  );
}