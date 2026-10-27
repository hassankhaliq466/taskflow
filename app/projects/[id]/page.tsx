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
  CalendarDays,
  Mail,
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
import { toast } from "sonner";
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
  type Project,
  type Priority,
  type Status,
  type Task,
  type TaskType,
  type Member,
} from "@/lib/workspace-store";
import { roleOptions } from "@/components/invite-member-dialog";
import { startNavigationLoading } from "@/lib/navigation-loading";

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

type ProjectStatus = "Planning" | "Active" | "On Hold" | "Completed";

interface ProjectSettingsValues {
  name: string;
  description: string;
  status: ProjectStatus;
  color: string;
  dueDate: string;
}

const projectStatusOptions: ProjectStatus[] = [
  "Planning",
  "Active",
  "On Hold",
  "Completed",
];

const projectColorOptions = [
  { name: "Blue", className: "bg-blue-500" },
  { name: "Amber", className: "bg-amber-500" },
  { name: "Emerald", className: "bg-emerald-500" },
  { name: "Violet", className: "bg-violet-500" },
  { name: "Rose", className: "bg-rose-500" },
  { name: "Slate", className: "bg-slate-500" },
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

const tabs = ["Tasks", "Members", "Settings"];

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

const getProjectDueDate = (project: Project) => {
  if (project.dueDate) return project.dueDate;
  const legacyDate = project.due.replace(/^Due\s+/, "");
  if (legacyDate === "Completed" || legacyDate === "No due date") return "";

  const hasYear = /\b\d{4}\b/.test(legacyDate);
  const date = new Date(
    hasYear ? legacyDate : `${legacyDate} ${new Date().getFullYear()}`,
  );
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const formatProjectDue = (dueDate: string, status: ProjectStatus) => {
  if (status === "Completed") return "Completed";
  if (!dueDate) return "No due date";
  const [year, month, day] = dueDate.split("-").map(Number);
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (year !== new Date().getFullYear()) options.year = "numeric";
  return `Due ${new Date(year, month - 1, day).toLocaleDateString("en-US", options)}`;
};

const getProjectSettings = (project: Project): ProjectSettingsValues => ({
  name: project.name,
  description: project.description,
  status: projectStatusOptions.includes(project.status as ProjectStatus)
    ? (project.status as ProjectStatus)
    : "Planning",
  color: project.color,
  dueDate: getProjectDueDate(project),
});

const emptyProjectSettings: ProjectSettingsValues = {
  name: "",
  description: "",
  status: "Planning",
  color: projectColorOptions[0].className,
  dueDate: "",
};

const fieldClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 [&>option]:bg-white [&>option]:text-black";

const filterSelectClass =
  "h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 [&>option]:bg-white [&>option]:text-black";

/* -------------------------------------------------------------------------- */
/*                               Small components                             */
/* -------------------------------------------------------------------------- */

function Avatar({ name, initials }: { name: string; initials?: string }) {
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
    >
      {initials || name.charAt(0).toUpperCase()}
    </span>
  );
}

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
  projectMembers,
  initialValues,
  onClose,
  onSubmit,
}: {
  projectMembers: Member[];
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
                {projectMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
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
  const project = useWorkspaceStore((s) =>
    s.projects.find((p) => p.id === id && p.workspaceId === s.activeWorkspaceId)
  );
  const allTasks = useWorkspaceStore((s) => s.tasks);
  const allMembers = useWorkspaceStore((s) => s.members);
  const projectMemberRecords = useWorkspaceStore((s) => s.projectMembers);
  const addTask = useWorkspaceStore((s) => s.addTask);
  const updateTask = useWorkspaceStore((s) => s.updateTask);
  const deleteTask = useWorkspaceStore((s) => s.deleteTask);
  const updateProject = useWorkspaceStore((s) => s.updateProject);
  const deleteProject = useWorkspaceStore((s) => s.deleteProject);
  const addProjectMember = useWorkspaceStore((s) => s.addProjectMember);
  const updateProjectMember = useWorkspaceStore((s) => s.updateProjectMember);
  const removeProjectMember = useWorkspaceStore((s) => s.removeProjectMember);
  const currentProjectRole = useWorkspaceStore((s) => s.currentProjectRole);
  const setCurrentProjectRole = useWorkspaceStore((s) => s.setCurrentProjectRole);
  const currentUserId = useWorkspaceStore((s) => s.currentUserId);

  const workspaceMembers = useMemo(
    () => allMembers.filter((member) => member.workspaceId === project?.workspaceId),
    [allMembers, project?.workspaceId],
  );

  const projectMemberRows = useMemo(() => {
    const memberById = new Map(workspaceMembers.map((member) => [member.id, member]));
    return projectMemberRecords
      .filter((entry) => entry.projectId === id)
      .flatMap((entry) => {
        const member = memberById.get(entry.memberId);
        return member ? [{ ...entry, member }] : [];
      });
  }, [projectMemberRecords, workspaceMembers, id]);

  const availableMembers = useMemo(() => {
    const projectMemberIds = new Set(
      projectMemberRows.map((entry) => entry.memberId),
    );
    return workspaceMembers.filter((member) => !projectMemberIds.has(member.id));
  }, [projectMemberRows, workspaceMembers]);

  const projectMembers = useMemo(
    () => projectMemberRows.map((entry) => entry.member),
    [projectMemberRows],
  );

  // Set current project role when project changes
  useEffect(() => {
    if (id) {
      setCurrentProjectRole(id);
    }
  }, [id, setCurrentProjectRole]);

  const isProjectAdmin = currentProjectRole === "admin";

  const [tab, setTab] = useState<string>("Tasks");
  // null = closed, "create" = new task, Task = editing that task
  const [dialog, setDialog] = useState<null | "create" | Task>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | TaskType>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all"); // "all" | "unassigned" | member id
  const [settingsDraft, setSettingsDraft] = useState<{
    projectId: string;
    values: Partial<ProjectSettingsValues>;
  }>({ projectId: "", values: {} });
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const settings = project
    ? {
        ...getProjectSettings(project),
        ...(settingsDraft.projectId === project.id ? settingsDraft.values : {}),
      }
    : emptyProjectSettings;

  // Filter in useMemo, not inside the selector (a selector that returns a
  // new array every call can cause an infinite render loop)
  const projectTasks = useMemo(
    () => allTasks.filter((t) => t.projectId === id),
    [allTasks, id],
  );

  if (!hydrated) {
    return (
      <AppShell>
        <p role="status" className="p-6 text-sm text-muted-foreground">
          Loading project...
        </p>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <div className="flex flex-col gap-3 p-6">
          <h1 className="text-xl font-semibold">Project unavailable</h1>
          <p role="alert" className="text-sm text-muted-foreground">
            This project may have been deleted or you may no longer have access to it.
          </p>
          <Link
            href="/projects"
            className="w-fit text-sm font-medium text-primary hover:underline"
          >
            Back to projects
          </Link>
        </div>
      </AppShell>
    );
  }

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
    projectMembers.find((member) => member.id === memberId)?.name ?? null;

  const updateSettings = <K extends keyof ProjectSettingsValues>(
    key: K,
    value: ProjectSettingsValues[K],
  ) =>
    setSettingsDraft((previous) => ({
      projectId: project.id,
      values: {
        ...(previous.projectId === project.id ? previous.values : {}),
        [key]: value,
      },
    }));

  const handleSaveSettings = () => {
    if (!settings.name.trim()) {
      toast.error("Enter a name for the project.");
      return;
    }

    updateProject(project.id, {
      name: settings.name.trim(),
      description: settings.description.trim(),
      status: settings.status,
      color: settings.color,
      dueDate: settings.dueDate,
      due: formatProjectDue(settings.dueDate, settings.status),
    });
    setSettingsDraft({ projectId: project.id, values: {} });
    toast.success("Project changes saved");
  };

  const handleDeleteProject = () => {
    if (!window.confirm(`Delete "${project.name}" and all of its tasks?`)) return;
    deleteProject(project.id);
    toast.success("Project deleted");
    startNavigationLoading();
    router.push("/projects");
  };

  const handleAddProjectMember = () => {
    if (!selectedMemberId) return;
    addProjectMember(project.id, selectedMemberId, "Team Member");
    setSelectedMemberId("");
  };

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
          {isProjectAdmin && (
            <Button onClick={() => setDialog("create")}>
              <Plus className="size-4" />
              <span>New Task</span>
            </Button>
          )}
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
            value={projectMemberRows.length}
            iconClass="text-blue-600 dark:text-blue-400"
          />
        </div>

        {/* Tabs */}
        <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-1">
          {tabs
            .filter((name) => {
              if ((name === "Settings" || name === "Members") && !isProjectAdmin) {
                return false;
              }
              return true;
            })
            .map((name) => (
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

        {tab === "Settings" && (
          <div className="flex max-w-3xl flex-col gap-5">
            <Card>
              <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
                <Field label="Project Name" htmlFor="settings-project-name">
                  <input
                    id="settings-project-name"
                    value={settings.name}
                    onChange={(event) => updateSettings("name", event.target.value)}
                    className={fieldClass}
                  />
                </Field>
                <Field label="Status" htmlFor="settings-project-status">
                  <select
                    id="settings-project-status"
                    value={settings.status}
                    onChange={(event) =>
                      updateSettings("status", event.target.value as ProjectStatus)
                    }
                    className={fieldClass}
                  >
                    {projectStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Description" htmlFor="settings-project-description">
                    <textarea
                      id="settings-project-description"
                      rows={3}
                      value={settings.description}
                      onChange={(event) =>
                        updateSettings("description", event.target.value)
                      }
                      className={`${fieldClass} h-auto resize-y py-2`}
                    />
                  </Field>
                </div>
                <Field label="Color">
                  <div
                    role="radiogroup"
                    aria-label="Project color"
                    className="flex flex-wrap gap-3 py-1"
                  >
                    {projectColorOptions.map((color) => {
                      const selected = settings.color === color.className;
                      return (
                        <button
                          key={color.className}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-label={color.name}
                          onClick={() => updateSettings("color", color.className)}
                          className={`size-8 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${color.className} ${
                            selected
                              ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                              : "opacity-80 hover:opacity-100"
                          }`}
                        />
                      );
                    })}
                  </div>
                </Field>
                <Field label="Due Date" htmlFor="settings-project-due-date">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-5 shrink-0 text-muted-foreground" />
                    <input
                      id="settings-project-due-date"
                      type="date"
                      value={settings.dueDate}
                      onChange={(event) => updateSettings("dueDate", event.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </Field>
                <div className="flex justify-end sm:col-span-2">
                  <Button type="button" onClick={handleSaveSettings}>
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/40">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
                <div>
                  <h2 className="font-semibold">Danger Zone</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Deleting this project also permanently deletes its tasks.
                  </p>
                </div>
                <Button variant="destructive" onClick={handleDeleteProject}>
                  <Trash2 data-icon="inline-start" />
                  Delete Project
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "Members" && (
          <div className="flex flex-col gap-5">
            <Card>
              <CardContent className="flex flex-col gap-5 p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">Project Members</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Manage the people assigned to this project.
                    </p>
                  </div>
                  {availableMembers.length > 0 && (
                    <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
                      <label className="flex min-w-52 flex-1 flex-col gap-2 text-sm font-medium sm:flex-none">
                        Add Member
                        <select
                          aria-label="Select a workspace member to add"
                          value={selectedMemberId}
                          onChange={(event) => setSelectedMemberId(event.target.value)}
                          className={fieldClass}
                        >
                          <option value="">Select a member</option>
                          {availableMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        type="button"
                        onClick={handleAddProjectMember}
                        disabled={!selectedMemberId}
                      >
                        <Plus data-icon="inline-start" />
                        Add Member
                      </Button>
                    </div>
                  )}
                </div>

                {availableMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No one else is available to add. Invite members from the{" "}
                    <Link href="/team" className="font-medium text-primary hover:underline">
                      Team page
                    </Link>
                    .
                  </p>
                )}

                {projectMemberRows.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                    No members have been added to this project yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {projectMemberRows.map(({ member, role }) => (
                      <li key={member.id} className="flex flex-wrap items-center gap-3 p-4">
                        <Avatar name={member.name} initials={member.initials} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{member.name}</p>
                          <a
                            href={`mailto:${member.email}`}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                          >
                            <Mail className="size-3.5 shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </a>
                        </div>
                        {member.role === "owner" ? (
                          <span className="rounded-md bg-muted px-2.5 py-1.5 text-sm font-medium">
                            Owner
                          </span>
                        ) : isProjectAdmin ? (
                          <>
                            <select
                              aria-label={`Role for ${member.name}`}
                              value={role}
                              onChange={(event) =>
                                updateProjectMember(project.id, member.id, event.target.value)
                              }
                              className={`${filterSelectClass} w-48 max-w-full`}
                            >
                              {roleOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeProjectMember(project.id, member.id)}
                            >
                              <Trash2 data-icon="inline-start" />
                              Remove
                            </Button>
                          </>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
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
                {projectMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
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
                              {(() => {
                                const isAssignee = currentUserId ? task.assigneeId === currentUserId : false;
                                return (
                                  <select
                                    aria-label={`Status for ${task.title}`}
                                    value={task.status}
                                    onChange={(e) =>
                                      handleStatusChange(
                                        task.id,
                                        e.target.value as Status,
                                      )
                                    }
                                    disabled={!isProjectAdmin && !isAssignee}
                                    className={`h-8 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none transition hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 [&>option]:bg-white [&>option]:text-black ${
                                      !isProjectAdmin && !isAssignee ? "opacity-50 cursor-not-allowed" : ""
                                    }`}
                                  >
                                    {statusOptions.map((o) => (
                                      <option key={o.value} value={o.value}>
                                        {o.label}
                                      </option>
                                    ))}
                                  </select>
                                );
                              })()}
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
                            {isProjectAdmin && (
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
                            )}
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
          projectMembers={projectMembers}
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