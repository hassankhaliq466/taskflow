"use server";

import { auth } from "@/lib/auth";
import { requireWorkspaceRole, requireProjectRole } from "@/lib/permissions";
import {
  createProject,
  findProjectById,
  findProjectsByWorkspaceId,
  updateProject,
  deleteProject,
} from "@/models/Project";
import {
  addProjectMember,
  findProjectMember,
  findProjectMembers,
  updateProjectMemberRole,
  removeProjectMember,
  isProjectAdmin,
} from "@/models/ProjectMember";
import {
  deleteTasksByProjectId,
  findTasksByProjectId,
  updateTask,
} from "@/models/Task";
import { findWorkspaceMember } from "@/models/WorkspaceMember";
import { findUserByEmail } from "@/models/User";
import { revalidatePath } from "next/cache";

async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function createProjectAction(
  workspaceId: string,
  input: {
    name: string;
    description: string;
    status: string;
    color: string;
    due: string;
    dueDate?: string;
  }
): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const perm = await requireWorkspaceRole(userId, workspaceId, "member");
  if (!perm.ok) return { ok: false, error: perm.error };

  const trimmed = input.name.trim();
  if (!trimmed) return { ok: false, error: "Project name is required" };

  const project = await createProject(workspaceId, {
    ...input,
    name: trimmed,
  });

  await addProjectMember(project._id!.toString(), userId, "admin");

  revalidatePath(`/workspace/${workspaceId}`);
  return { ok: true, projectId: project._id!.toString() };
}

export async function listMyProjectsAction(): Promise<{ ok: true; projects: { id: string; name: string; workspaceId: string; role: string }[] } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const memberships = await findProjectMembers(userId);
  const projects = await Promise.all(
    memberships.map(async (m) => {
      const project = await findProjectById(m.projectId.toString());
      return {
        id: m.projectId.toString(),
        name: project?.name ?? "Unknown Project",
        workspaceId: project?.workspaceId.toString() ?? "",
        role: m.role,
      };
    })
  );

  return { ok: true, projects };
}

export async function updateProjectAction(
  projectId: string,
  patch: {
    name?: string;
    description?: string;
    status?: string;
    color?: string;
    due?: string;
    dueDate?: string;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const perm = await requireProjectRole(userId, projectId, "admin");
  if (!perm.ok) return { ok: false, error: perm.error };

  const project = await findProjectById(projectId);
  if (!project) return { ok: false, error: "Project not found" };

  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) return { ok: false, error: "Project name cannot be empty" };
    patch.name = trimmed;
  }

  await updateProject(projectId, patch);
  revalidatePath(`/project/${projectId}`);
  revalidatePath(`/workspace/${project.workspaceId.toString()}`);
  return { ok: true };
}

export async function deleteProjectAction(projectId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const perm = await requireProjectRole(userId, projectId, "admin");
  if (!perm.ok) return { ok: false, error: perm.error };

  const project = await findProjectById(projectId);
  if (!project) return { ok: false, error: "Project not found" };

  await deleteTasksByProjectId(projectId);

  const members = await findProjectMembers(projectId);
  for (const member of members) {
    await removeProjectMember(projectId, member.userId.toString());
  }

  await deleteProject(projectId);
  revalidatePath(`/workspace/${project.workspaceId.toString()}`);
  return { ok: true };
}

export async function addProjectMemberAction(
  projectId: string,
  userId: string,
  role: "admin" | "member"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const currentUserId = await getUserId();
  if (!currentUserId) return { ok: false, error: "Not authenticated" };

  const perm = await requireProjectRole(currentUserId, projectId, "admin");
  if (!perm.ok) return { ok: false, error: perm.error };

  const project = await findProjectById(projectId);
  if (!project) return { ok: false, error: "Project not found" };

  const workspaceMember = await findWorkspaceMember(project.workspaceId.toString(), userId);
  if (!workspaceMember) return { ok: false, error: "User is not a member of this workspace" };

  const existing = await findProjectMember(projectId, userId);
  if (existing) return { ok: false, error: "User is already a project member" };

  await addProjectMember(projectId, userId, role);
  revalidatePath(`/project/${projectId}`);
  return { ok: true };
}

export async function removeProjectMemberAction(
  projectId: string,
  targetUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const perm = await requireProjectRole(userId, projectId, "admin");
  if (!perm.ok) return { ok: false, error: perm.error };

  if (userId === targetUserId) return { ok: false, error: "Cannot remove yourself" };

  const targetMember = await findProjectMember(projectId, targetUserId);
  if (!targetMember) return { ok: false, error: "Member not found" };

  if (targetMember.role === "admin") {
    const members = await findProjectMembers(projectId);
    const adminCount = members.filter((m) => m.role === "admin").length;
    if (adminCount <= 1) {
      return { ok: false, error: "Cannot remove last project admin" };
    }
  }

  const tasks = await findTasksByProjectId(projectId);
  for (const task of tasks) {
    if (task.assigneeId?.toString() === targetUserId) {
      await updateTask(task._id!.toString(), { assigneeId: null });
    }
  }

  await removeProjectMember(projectId, targetUserId);
  revalidatePath(`/project/${projectId}`);
  return { ok: true };
}

export async function changeProjectMemberRoleAction(
  projectId: string,
  targetUserId: string,
  newRole: "admin" | "member"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const perm = await requireProjectRole(userId, projectId, "admin");
  if (!perm.ok) return { ok: false, error: perm.error };

  if (userId === targetUserId) return { ok: false, error: "Cannot change your own role" };

  const targetMember = await findProjectMember(projectId, targetUserId);
  if (!targetMember) return { ok: false, error: "Member not found" };

  if (targetMember.role === "admin" && newRole === "member") {
    const members = await findProjectMembers(projectId);
    const adminCount = members.filter((m) => m.role === "admin").length;
    if (adminCount <= 1) {
      return { ok: false, error: "Cannot demote last project admin" };
    }
  }

  await updateProjectMemberRole(projectId, targetUserId, newRole);
  revalidatePath(`/project/${projectId}`);
  return { ok: true };
}