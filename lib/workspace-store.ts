"use client";

import { create, StateCreator } from "zustand";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type Status = "todo" | "in-progress" | "done";
export type TaskType = "task" | "bug" | "feature";
export type Priority = "low" | "medium" | "high";

export interface Workspace {
  id: string;
  name: string;
}

export interface Member {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  initials: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: string;
  color: string;
  progress: number;
  due: string;
  dueDate?: string;
  members: number;
}

export interface ProjectMember {
  projectId: string;
  memberId: string;
  role: "admin" | "member";
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  type: TaskType;
  priority: Priority;
  status: Status;
  assigneeId: string | null;
  dueDate: string | null;
}

export type NewProjectInput = Omit<Project, "id" | "progress">;
export type NewTaskInput = Omit<Task, "id">;
export type TaskPatch = Partial<Omit<Task, "id" | "projectId">>;

/* -------------------------------------------------------------------------- */
/*                              Store Interfaces                              */
/* -------------------------------------------------------------------------- */

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  workspacesLoaded: boolean;
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  currentUserId: string | null;
  profile: { name: string; email: string } | null;
  currentWorkspaceRole: "owner" | "admin" | "member" | null;
  currentProjectRole: "admin" | "member" | null;
  fetchWorkspaces: () => Promise<void>;
  fetchWorkspaceMembers: (workspaceId: string) => Promise<void>;
  fetchProjects: (workspaceId: string) => Promise<void>;
  fetchProjectMembers: (projectId: string) => Promise<void>;
  fetchTasks: (projectId: string) => Promise<void>;
  addWorkspace: (name: string) => Promise<string>;
  deleteWorkspace: (id: string) => Promise<void>;
  updateWorkspace: (id: string, patch: Partial<Workspace>) => Promise<void>;
  updateCurrentUserProfile: (profile: { name: string; email: string }) => void;
  setActiveWorkspace: (id: string) => void;
  setHydrated: () => void;
  setCurrentUser: (userId: string | null) => void;
}

interface TeamSlice {
  members: Member[];
  loading: boolean;
  error: string | null;
  deleteMember: (id: string, workspaceId: string) => Promise<void>;
  addMember: (input: {
    workspaceId: string;
    name: string;
    email: string;
    role: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

interface ProjectSlice {
  projects: Project[];
  projectMembers: ProjectMember[];
  tasks: Task[];
  loading: boolean;
  error: string | null;
  addProject: (input: NewProjectInput) => Promise<string>;
  updateProject: (id: string, patch: Partial<Omit<Project, "id">>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addProjectMember: (projectId: string, memberId: string, role: string) => Promise<void>;
  updateProjectMember: (projectId: string, memberId: string, role: string) => Promise<void>;
  removeProjectMember: (projectId: string, memberId: string) => Promise<void>;
  addTask: (input: NewTaskInput) => Promise<void>;
  updateTask: (id: string, patch: TaskPatch) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setCurrentProjectRole: (projectId: string) => void;
}

type BoundStoreState = WorkspaceState & TeamSlice & ProjectSlice;

/* -------------------------------------------------------------------------- */
/*                            Server Action Wrappers                          */
/* -------------------------------------------------------------------------- */

interface ServerResponse<T> {
  ok: true;
  data: T;
}

interface ServerError {
  ok: false;
  error: string;
}

async function callServerAction<T>(
  action: () => Promise<ServerResponse<T> | ServerError>
): Promise<ServerResponse<T> | ServerError> {
  try {
    return await action();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

function normalizeId(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "$oid" in value) {
    const objectId = (value as { $oid?: unknown }).$oid;
    if (typeof objectId === "string") return objectId;
  }
  return "";
}

function normalizeProject(value: Record<string, unknown>): Project {
  return {
    ...value,
    id: normalizeId(value.id ?? value._id),
    workspaceId: normalizeId(value.workspaceId),
  } as Project;
}

function normalizeTask(value: Record<string, unknown>): Task {
  return {
    ...value,
    id: normalizeId(value.id ?? value._id),
    projectId: normalizeId(value.projectId),
    assigneeId: value.assigneeId == null ? null : normalizeId(value.assigneeId),
  } as Task;
}

function normalizeProjectMember(value: Record<string, unknown>): ProjectMember {
  return {
    projectId: normalizeId(value.projectId),
    memberId: normalizeId(value.memberId ?? value.userId),
    role: value.role as ProjectMember["role"],
  };
}

/* -------------------------------------------------------------------------- */
/*                               Slice Creators                               */
/* -------------------------------------------------------------------------- */

const createWorkspaceSlice: StateCreator<
  BoundStoreState,
  [],
  [],
  WorkspaceState
> = (set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  profile: null,
  workspacesLoaded: false,
  hydrated: false,
  loading: false,
  error: null,
  currentUserId: null,
  currentWorkspaceRole: null,
  currentProjectRole: null,

  fetchWorkspaces: async () => {
    const userId = get().currentUserId;
    set({ loading: true, error: null });
    const res = await callServerAction<{ workspaces: Workspace[] }>(() =>
      fetch("/api/workspaces").then(r => r.json())
    );
    if (res.ok) {
      set((state) => {
        if (state.currentUserId !== userId) return { loading: false };
        const activeExists = res.data.workspaces.some(
          (workspace) => workspace.id === state.activeWorkspaceId,
        );
        const activeWorkspaceId = activeExists
          ? state.activeWorkspaceId
          : res.data.workspaces[0]?.id ?? null;
        const workspaceChanged = activeWorkspaceId !== state.activeWorkspaceId;
        return {
          workspaces: res.data.workspaces,
          activeWorkspaceId,
          workspacesLoaded: true,
          loading: false,
          ...(workspaceChanged
            ? {
                members: [],
                projects: [],
                projectMembers: [],
                tasks: [],
                currentWorkspaceRole: null,
                currentProjectRole: null,
                hydrated: false,
              }
            : {}),
        };
      });
    } else {
      set({
        error: res.error || "Failed to load workspaces",
        loading: false,
        workspacesLoaded: true,
      });
    }
  },

  fetchWorkspaceMembers: async (workspaceId: string) => {
    const res = await callServerAction<{ members: Member[] }>(() =>
      fetch(`/api/workspaces/${workspaceId}/members`).then(r => r.json())
    );
    if (res.ok) {
      if (get().activeWorkspaceId !== workspaceId) return;
      const members = res.data.members;
      const currentMember = members.find((member) => member.id === get().currentUserId);
      set({
        members,
        currentWorkspaceRole: currentMember?.role ?? null,
      });
    } else {
      set({ error: res.error || "Failed to load workspace members" });
    }
  },

  fetchProjects: async (workspaceId: string) => {
    const res = await callServerAction<{ projects: Project[] }>(() =>
      fetch(`/api/workspaces/${workspaceId}/projects`).then(r => r.json())
    );
    if (res.ok) {
      if (get().activeWorkspaceId !== workspaceId) return;
      const projects = (res.data.projects as unknown as Record<string, unknown>[])
        .map(normalizeProject);
      set((state) => ({
        projects: [
          ...state.projects.filter((project) => project.workspaceId !== workspaceId),
          ...projects,
        ],
      }));
    } else {
      set({ error: res.error || "Failed to load projects" });
    }
  },

  fetchProjectMembers: async (projectId: string) => {
    const res = await callServerAction<{ members: ProjectMember[] }>(() =>
      fetch(`/api/projects/${projectId}/members`).then((response) => response.json())
    );
    if (res.ok) {
      if (!get().projects.some((project) => project.id === projectId)) return;
      const members = (res.data.members as unknown as Record<string, unknown>[])
        .map(normalizeProjectMember);
      set((state) => ({
        projectMembers: [
          ...state.projectMembers.filter((member) => member.projectId !== projectId),
          ...members,
        ],
      }));
      get().setCurrentProjectRole(projectId);
    } else {
      set({ error: res.error || "Failed to load project members" });
    }
  },

  fetchTasks: async (projectId: string) => {
    const res = await callServerAction<{ tasks: Task[] }>(() =>
      fetch(`/api/projects/${projectId}/tasks`).then(r => r.json())
    );
    if (res.ok) {
      if (!get().projects.some((project) => project.id === projectId)) return;
      const tasks = (res.data.tasks as unknown as Record<string, unknown>[])
        .map(normalizeTask);
      set((state) => ({
        tasks: [
          ...state.tasks.filter((task) => task.projectId !== projectId),
          ...tasks,
        ],
      }));
    } else {
      set({ error: res.error || "Failed to load tasks" });
    }
  },

  addWorkspace: async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return "";

    const res = await callServerAction<{ workspaceId: string }>(() =>
      fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      }).then(r => r.json())
    );

    if (!res.ok) {
      set({ error: res.error || "Failed to create workspace" });
      return "";
    }

    const workspaceId = res.data.workspaceId;
    if (workspaceId) {
      await get().fetchWorkspaces();
    }
    return workspaceId || "";
  },

  deleteWorkspace: async (id: string) => {
    const res = await callServerAction(() =>
      fetch(`/api/workspaces/${id}`, { method: "DELETE" }).then(r => r.json())
    );
    if (!res.ok) {
      set({ error: res.error || "Failed to delete workspace" });
      return;
    }
    await get().fetchWorkspaces();
  },

  updateWorkspace: async (id: string, patch: Partial<Workspace>) => {
    const res = await callServerAction(() =>
      fetch(`/api/workspaces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).then(r => r.json())
    );
    if (!res.ok) {
      set({ error: res.error || "Failed to update workspace" });
      return;
    }
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === id ? { ...w, ...patch } : w
      ),
    }));
  },

  updateCurrentUserProfile: (profile) =>
    set((state) => {
      if (!state.currentUserId) return {};

      const initials = profile.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("");

      return {
        profile,
        members: state.members.map((member) =>
          member.id === state.currentUserId
            ? { ...member, ...profile, initials }
            : member,
        ),
      };
    }),

  setActiveWorkspace: (id: string) =>
    set((state) => {
      if (!state.workspaces.some((w) => w.id === id)) return {};
      if (state.activeWorkspaceId === id) return {};
      return {
        activeWorkspaceId: id,
        hydrated: false,
        members: [],
        projects: [],
        projectMembers: [],
        tasks: [],
        currentWorkspaceRole: null,
        currentProjectRole: null,
      };
    }),

  setHydrated: () => set({ hydrated: true }),

  setCurrentUser: (userId: string | null) =>
    set((state) => {
      if (state.currentUserId === userId) return {};
      return {
        currentUserId: userId,
        profile: null,
        workspaces: [],
        activeWorkspaceId: null,
        workspacesLoaded: false,
        members: [],
        projects: [],
        projectMembers: [],
        tasks: [],
        currentWorkspaceRole: null,
        currentProjectRole: null,
        hydrated: false,
        loading: false,
        error: null,
      };
    }),
});

const createTeamSlice: StateCreator<
  BoundStoreState,
  [],
  [],
  TeamSlice
> = (set, get) => ({
  members: [],
  loading: false,
  error: null,

  deleteMember: async (id: string, workspaceId: string) => {
    const res = await callServerAction(() =>
      fetch(`/api/workspaces/${workspaceId}/members/${id}`, { method: "DELETE" }).then(r => r.json())
    );
    if (!res.ok) {
      set({ error: res.error || "Failed to remove member" });
      return;
    }
    set((state) => ({
      members: state.members.filter((m) => m.id !== id),
      projectMembers: state.projectMembers.filter((pm) => pm.memberId !== id),
      tasks: state.tasks.map((t) =>
        t.assigneeId === id ? { ...t, assigneeId: null } : t
      ),
    }));
  },

  addMember: async (input) => {
    const email = input.email.trim().toLowerCase();
    const res = await callServerAction(() =>
      fetch(`/api/workspaces/${input.workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: input.role }),
      }).then(r => r.json())
    );
    if (!res.ok) {
      return { ok: false, error: res.error || "Failed to add member" };
    }
    await get().fetchWorkspaceMembers(input.workspaceId);
    return { ok: true };
  },
});

const createProjectSlice: StateCreator<
  BoundStoreState,
  [],
  [],
  ProjectSlice
> = (set, get) => ({
  projects: [],
  projectMembers: [],
  tasks: [],
  loading: false,
  error: null,

  setCurrentProjectRole: (projectId: string) => {
    const userId = get().currentUserId;
    if (!userId) {
      set({ currentProjectRole: null });
      return;
    }
    const membership = get().projectMembers.find(
      (pm) => pm.projectId === projectId && pm.memberId === userId
    );
    set({ currentProjectRole: membership?.role ?? null });
  },

  addProject: async (input) => {
    const activeWorkspaceId = get().activeWorkspaceId;
    if (!activeWorkspaceId) return "";

    const res = await callServerAction<{ projectId: string }>(() =>
      fetch(`/api/workspaces/${activeWorkspaceId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }).then(r => r.json())
    );

    if (!res.ok) {
      set({ error: res.error || "Failed to create project" });
      return "";
    }

    const projectId = res.data.projectId;
    if (projectId) {
      await get().fetchProjects(activeWorkspaceId);
      await Promise.all([
        get().fetchTasks(projectId),
        get().fetchProjectMembers(projectId),
      ]);
    }
    return projectId || "";
  },

  updateProject: async (id: string, patch: Partial<Omit<Project, "id">>) => {
    const project = get().projects.find((p) => p.id === id);
    if (!project) return;

    const res = await callServerAction(() =>
      fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).then(r => r.json())
    );

    if (!res.ok) {
      set({ error: res.error || "Failed to update project" });
      return;
    }

    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...patch };
        if (patch.status === "Completed") updated.progress = 100;
        else if (patch.status && p.status === "Completed") updated.progress = 0;
        return updated;
      }),
    }));
  },

  deleteProject: async (id: string) => {
    const project = get().projects.find((p) => p.id === id);
    if (!project) return;

    const res = await callServerAction(() =>
      fetch(`/api/projects/${id}`, { method: "DELETE" }).then(r => r.json())
    );
    if (!res.ok) {
      set({ error: res.error || "Failed to delete project" });
      return;
    }

    const workspaceId = project.workspaceId;
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      projectMembers: state.projectMembers.filter((pm) => pm.projectId !== id),
      tasks: state.tasks.filter((t) => t.projectId !== id),
    }));

    await get().fetchProjects(workspaceId);
  },

  addProjectMember: async (projectId: string, memberId: string, role: string) => {
    const res = await callServerAction(() =>
      fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberId, role }),
      }).then(r => r.json())
    );
    if (!res.ok) {
      set({ error: res.error || "Failed to add project member" });
      return;
    }
    const projectRole = role as "admin" | "member";
    set((state) => ({
      projectMembers: [
        ...state.projectMembers.filter(
          (member) => member.projectId !== projectId || member.memberId !== memberId,
        ),
        { projectId, memberId, role: projectRole },
      ],
    }));
  },

  updateProjectMember: async (projectId: string, memberId: string, role: string) => {
    const res = await callServerAction(() =>
      fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }).then(r => r.json())
    );
    if (!res.ok) {
      set({ error: res.error || "Failed to update project member" });
      return;
    }
    const projectRole = role as "admin" | "member";
    set((state) => ({
      projectMembers: state.projectMembers.map((pm) =>
        pm.projectId === projectId && pm.memberId === memberId
          ? { ...pm, role: projectRole }
          : pm
      ),
    }));
  },

  removeProjectMember: async (projectId: string, memberId: string) => {
    const res = await callServerAction(() =>
      fetch(`/api/projects/${projectId}/members/${memberId}`, { method: "DELETE" }).then(r => r.json())
    );
    if (!res.ok) {
      set({ error: res.error || "Failed to remove project member" });
      return;
    }
    set((state) => ({
      projectMembers: state.projectMembers.filter(
        (pm) => pm.projectId !== projectId || pm.memberId !== memberId
      ),
      tasks: state.tasks.map((t) =>
        t.projectId === projectId && t.assigneeId === memberId
          ? { ...t, assigneeId: null }
          : t
      ),
    }));
  },

  addTask: async (input) => {
    const project = get().projects.find((p) => p.id === input.projectId);
    if (!project) {
      set({ error: "Project not found" });
      return;
    }
    const activeWorkspaceId = get().activeWorkspaceId;
    if (project.workspaceId !== activeWorkspaceId) {
      set({ error: "Project does not belong to active workspace" });
      return;
    }

    const res = await callServerAction(() =>
      fetch(`/api/projects/${input.projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }).then(r => r.json())
    );

    if (!res.ok) {
      set({ error: res.error || "Failed to create task" });
      return;
    }

    await get().fetchTasks(input.projectId);
  },

  updateTask: async (id: string, patch: TaskPatch) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;

    const res = await callServerAction(() =>
      fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).then(r => r.json())
    );

    if (!res.ok) {
      set({ error: res.error || "Failed to update task" });
      return;
    }

    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  },

  deleteTask: async (id: string) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;

    const res = await callServerAction(() =>
      fetch(`/api/tasks/${id}`, { method: "DELETE" }).then(r => r.json())
    );

    if (!res.ok) {
      set({ error: res.error || "Failed to delete task" });
      return;
    }

    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },
});

/* -------------------------------------------------------------------------- */
/*                                Global Store                                */
/* -------------------------------------------------------------------------- */

export const useWorkspaceStore = create<BoundStoreState>()(
  (...a) => ({
    ...createWorkspaceSlice(...a),
    ...createTeamSlice(...a),
    ...createProjectSlice(...a),
  })
);