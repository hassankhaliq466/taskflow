import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";

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
  role: string;
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
  role: string;
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
  hydrated: boolean;
  addWorkspace: (name: string) => string;
  deleteWorkspace: (id: string) => void;
  updateWorkspace: (id: string, patch: Partial<Workspace>) => void;
  setActiveWorkspace: (id: string) => void;
  setHydrated: () => void;
}

interface TeamSlice {
  members: Member[];
  deleteMember: (id: string) => void;
  addMember: (input: {
    workspaceId: string;
    name: string;
    email: string;
    role: string;
  }) => { ok: boolean; error?: string };
}

interface ProjectSlice {
  projects: Project[];
  projectMembers: ProjectMember[];
  tasks: Task[];
  addProject: (input: NewProjectInput) => string;
  updateProject: (id: string, patch: Partial<Omit<Project, "id">>) => void;
  deleteProject: (id: string) => void;
  addProjectMember: (projectId: string, memberId: string, role: string) => void;
  updateProjectMember: (projectId: string, memberId: string, role: string) => void;
  removeProjectMember: (projectId: string, memberId: string) => void;
  addTask: (input: NewTaskInput) => void;
  updateTask: (id: string, patch: TaskPatch) => void;
  deleteTask: (id: string) => void;
}

type BoundStoreState = WorkspaceState & TeamSlice & ProjectSlice;

/* -------------------------------------------------------------------------- */
/*                               Slice Creators                               */
/* -------------------------------------------------------------------------- */

const createWorkspaceSlice: StateCreator<
  BoundStoreState,
  [],
  [],
  WorkspaceState
> = (set) => ({
  workspaces: [],
  activeWorkspaceId: null,
  hydrated: false,

  addWorkspace: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return "";

    const id = `ws-${crypto.randomUUID()}`;
    const workspace: Workspace = { id, name: trimmed };

    // The first workspace automatically becomes active.
    set((state) => ({
      workspaces: [...state.workspaces, workspace],
      activeWorkspaceId: state.activeWorkspaceId ?? id,
    }));

    return id;
  },

  deleteWorkspace: (id) =>
    set((state) => {
      const removedProjectIds = new Set(
        state.projects
          .filter((project) => project.workspaceId === id)
          .map((project) => project.id),
      );
      const workspaces = state.workspaces.filter(
        (workspace) => workspace.id !== id,
      );
      const activeWorkspaceExists = workspaces.some(
        (workspace) => workspace.id === state.activeWorkspaceId,
      );

      return {
        workspaces,
        activeWorkspaceId: activeWorkspaceExists
          ? state.activeWorkspaceId
          : workspaces[0]?.id ?? null,
        members: state.members.filter((member) => member.workspaceId !== id),
        projects: state.projects.filter((project) => project.workspaceId !== id),
        projectMembers: state.projectMembers.filter(
          (projectMember) => !removedProjectIds.has(projectMember.projectId),
        ),
        tasks: state.tasks.filter((task) => !removedProjectIds.has(task.projectId)),
      };
    }),

  updateWorkspace: (id, patch) =>
    set((state) => ({
      workspaces: state.workspaces.map((workspace) =>
        workspace.id === id ? { ...workspace, ...patch } : workspace,
      ),
    })),

  setActiveWorkspace: (id) =>
    set((state) => {
      // Never allow an invalid workspace id to become active.
      if (!state.workspaces.some((workspace) => workspace.id === id)) {
        return {};
      }

      return { activeWorkspaceId: id };
    }),

  setHydrated: () => set({ hydrated: true }),
});

const createTeamSlice: StateCreator<
  BoundStoreState,
  [],
  [],
  TeamSlice
> = (set, get) => ({
  members: [],

  deleteMember: (id) =>
    set((state) => ({
      members: state.members.filter((member) => member.id !== id),
      projectMembers: state.projectMembers.filter(
        (projectMember) => projectMember.memberId !== id,
      ),
      tasks: state.tasks.map((task) =>
        task.assigneeId === id ? { ...task, assigneeId: null } : task,
      ),
    })),

  addMember: (input) => {
    const email = input.email.trim().toLowerCase();

    const isDuplicate = get().members.some(
      (member) =>
        member.email === email && member.workspaceId === input.workspaceId,
    );

    if (isDuplicate) {
      return {
        ok: false,
        error: "Member already exists in this workspace.",
      };
    }

    const name = input.name.trim();

    const member: Member = {
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      name,
      email,
      role: input.role,
      initials: name
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .toUpperCase(),
    };

    set((state) => ({
      members: [...state.members, member],
    }));

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

  addProject: (input) => {
    // UUID avoids collisions when two workspaces have projects with the
    // same name.
    const id = `project-${crypto.randomUUID()}`;

    const project: Project = {
      ...input,
      id,
      progress: input.status === "Completed" ? 100 : 0,
    };

    set((state) => ({
      projects: [project, ...state.projects],
    }));

    return id;
  },

  updateProject: (id, patch) =>
    set((state) => ({
      projects: state.projects.map((project) => {
        if (project.id !== id) return project;

        return {
          ...project,
          ...patch,
          progress:
            patch.status === "Completed"
              ? 100
              : patch.status && project.status === "Completed"
                ? 0
                : project.progress,
        };
      }),
    })),

  deleteProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
      projectMembers: state.projectMembers.filter(
        (projectMember) => projectMember.projectId !== id,
      ),
      tasks: state.tasks.filter((task) => task.projectId !== id),
    })),

  addProjectMember: (projectId, memberId, role) =>
    set((state) => {
      const project = state.projects.find((item) => item.id === projectId);
      const member = state.members.find((item) => item.id === memberId);
      const alreadyAssigned = state.projectMembers.some(
        (item) => item.projectId === projectId && item.memberId === memberId,
      );

      if (
        !project ||
        !member ||
        project.workspaceId !== member.workspaceId ||
        alreadyAssigned
      ) {
        return {};
      }

      return {
        projectMembers: [...state.projectMembers, { projectId, memberId, role }],
      };
    }),

  updateProjectMember: (projectId, memberId, role) =>
    set((state) => ({
      projectMembers: state.projectMembers.map((item) =>
        item.projectId === projectId && item.memberId === memberId
          ? { ...item, role }
          : item,
      ),
    })),

  removeProjectMember: (projectId, memberId) =>
    set((state) => ({
      projectMembers: state.projectMembers.filter(
        (item) => item.projectId !== projectId || item.memberId !== memberId,
      ),
      tasks: state.tasks.map((task) =>
        task.projectId === projectId && task.assigneeId === memberId
          ? { ...task, assigneeId: null }
          : task,
      ),
    })),

  addTask: (input) => {
    const project = get().projects.find((p) => p.id === input.projectId);
    if (!project) {
      console.error("Cannot add task: project not found", input.projectId);
      return;
    }
    const activeWorkspaceId = get().activeWorkspaceId;
    if (project.workspaceId !== activeWorkspaceId) {
      console.error("Cannot add task: project does not belong to active workspace");
      return;
    }
    set((state) => ({
      tasks: [
        {
          ...input,
          id: crypto.randomUUID(),
        },
        ...state.tasks,
      ],
    }));
  },

  updateTask: (id, patch) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  deleteTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
});

/* -------------------------------------------------------------------------- */
/*                                Global Store                                */
/* -------------------------------------------------------------------------- */

export const useWorkspaceStore = create<BoundStoreState>()(
  persist(
    (...a) => ({
      ...createWorkspaceSlice(...a),
      ...createTeamSlice(...a),
      ...createProjectSlice(...a),
    }),
    {
      name: "taskflow-unified-storage",

      // We explicitly hydrate from the client in AppShell. This prevents
      // persisted localStorage state from briefly being mistaken for an
      // empty new account.
      skipHydration: true,

      partialize: (state) => ({
        workspaces: state.workspaces,
        activeWorkspaceId: state.activeWorkspaceId,
        members: state.members,
        projects: state.projects,
        projectMembers: state.projectMembers,
        tasks: state.tasks,
      }),

      version: 1,
      migrate: (persistedState, version) => {
        const persisted = persistedState as Partial<BoundStoreState>;
        return {
          ...persisted,
          projectMembers:
            version < 1 ? [] : (persisted.projectMembers ?? []),
        } as BoundStoreState;
      },

      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Recover gracefully if the stored active workspace was deleted or
        // the persisted state is from an older version.
        const activeWorkspaceExists = state.workspaces.some(
          (workspace) => workspace.id === state.activeWorkspaceId,
        );

        if (!activeWorkspaceExists) {
          state.activeWorkspaceId = state.workspaces[0]?.id ?? null;
        }

        state.setHydrated();
      },
    },
  ),
);
