"use server";

import { auth } from "@/lib/auth";
import { requireWorkspaceRole } from "@/lib/permissions";
import {
  createWorkspace,
  findWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
} from "@/models/Workspace";
import type { Workspace } from "@/models/Workspace";
import {
  addWorkspaceMember,
  findWorkspaceMember,
  findWorkspaceMembers,
  findUserWorkspaces,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
} from "@/models/WorkspaceMember";
import {
  findProjectsByWorkspaceId,
  deleteProject,
} from "@/models/Project";
import {
  removeProjectMember,
  findProjectMembers,
} from "@/models/ProjectMember";
import {
  deleteTasksByProjectId,
} from "@/models/Task";
import { revalidatePath } from "next/cache";

async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function createWorkspaceAction(name: string): Promise<{ ok: true; workspaceId: string } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Workspace name is required" };

  const workspace = await createWorkspace(trimmed);
  await addWorkspaceMember(workspace._id!.toString(), userId, "owner");

  revalidatePath("/dashboard");
  return { ok: true, workspaceId: workspace._id!.toString() };
}

export async function listMyWorkspacesAction(): Promise<{ ok: true; workspaces: { id: string; name: string; role: string }[] } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const memberships = await findUserWorkspaces(userId);
  const workspaces = await Promise.all(
    memberships.map(async (m) => {
      const workspace = await findWorkspaceById(m.workspaceId.toString());
      if (!workspace) return null;

      return {
        id: m.workspaceId.toString(),
        name: workspace.name,
        role: m.role,
      };
    })
  );

  return {
    ok: true,
    workspaces: workspaces.filter(
      (workspace): workspace is NonNullable<typeof workspace> =>
        workspace !== null,
    ),
  };
}

export async function inviteWorkspaceMemberAction(
  workspaceId: string,
  email: string,
  role: "admin" | "member"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const perm = await requireWorkspaceRole(userId, workspaceId, "admin");
  if (!perm.ok) return { ok: false, error: perm.error };

  const workspace = await findWorkspaceById(workspaceId);
  if (!workspace) return { ok: false, error: "Workspace not found" };

  const { findUserByEmail } = await import("@/models/User");
  const targetUser = await findUserByEmail(email);
  if (!targetUser) return { ok: false, error: "User not found" };

  const existing = await findWorkspaceMember(workspaceId, targetUser._id!.toString());
  if (existing) return { ok: false, error: "User is already a member" };

  await addWorkspaceMember(workspaceId, targetUser._id!.toString(), role);
  revalidatePath(`/workspace/${workspaceId}`);
  return { ok: true };
}

export async function removeWorkspaceMemberAction(
  workspaceId: string,
  targetUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const perm = await requireWorkspaceRole(userId, workspaceId, "admin");
  if (!perm.ok) return { ok: false, error: perm.error };

  if (userId === targetUserId) return { ok: false, error: "Cannot remove yourself" };

  const targetMember = await findWorkspaceMember(workspaceId, targetUserId);
  if (!targetMember) return { ok: false, error: "Member not found" };

  if (targetMember.role === "owner") return { ok: false, error: "Cannot remove owner" };

  const members = await findWorkspaceMembers(workspaceId);
  const adminCount = members.filter((m) => m.role === "admin" || m.role === "owner").length;
  if (targetMember.role === "admin" && adminCount <= 1) {
    return { ok: false, error: "Cannot remove last admin" };
  }

  await removeWorkspaceMember(workspaceId, targetUserId);
  revalidatePath(`/workspace/${workspaceId}`);
  return { ok: true };
}

export async function changeWorkspaceMemberRoleAction(
  workspaceId: string,
  targetUserId: string,
  newRole: "admin" | "member"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const perm = await requireWorkspaceRole(userId, workspaceId, "admin");
  if (!perm.ok) return { ok: false, error: perm.error };

  if (userId === targetUserId) return { ok: false, error: "Cannot change your own role" };

  const targetMember = await findWorkspaceMember(workspaceId, targetUserId);
  if (!targetMember) return { ok: false, error: "Member not found" };

  if (targetMember.role === "owner") return { ok: false, error: "Cannot change owner role" };

  const members = await findWorkspaceMembers(workspaceId);
  const adminCount = members.filter((m) => m.role === "admin" || m.role === "owner").length;
  if (targetMember.role === "admin" && newRole === "member" && adminCount <= 1) {
    return { ok: false, error: "Cannot demote last admin" };
  }

  await updateWorkspaceMemberRole(workspaceId, targetUserId, newRole);
  revalidatePath(`/workspace/${workspaceId}`);
  return { ok: true };
}

export async function updateWorkspaceAction(
  workspaceId: string,
  patch: Partial<Workspace>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const perm = await requireWorkspaceRole(userId, workspaceId, "admin");
  if (!perm.ok) return { ok: false, error: perm.error };

  const workspace = await findWorkspaceById(workspaceId);
  if (!workspace) return { ok: false, error: "Workspace not found" };

  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) return { ok: false, error: "Workspace name cannot be empty" };
    patch.name = trimmed;
  }

  await updateWorkspace(workspaceId, patch);
  revalidatePath(`/workspace/${workspaceId}`);
  return { ok: true };
}

export async function deleteWorkspaceAction(workspaceId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const perm = await requireWorkspaceRole(userId, workspaceId, "owner");
  if (!perm.ok) return { ok: false, error: perm.error };

  const workspace = await findWorkspaceById(workspaceId);
  if (!workspace) return { ok: false, error: "Workspace not found" };

  const projects = await findProjectsByWorkspaceId(workspaceId);
  for (const project of projects) {
    const projectId = project._id!.toString();
    await deleteTasksByProjectId(projectId);
    const projectMembers = await findProjectMembers(projectId);
    for (const pm of projectMembers) {
      await removeProjectMember(projectId, pm.userId.toString());
    }
    await deleteProject(projectId);
  }

  const members = await findWorkspaceMembers(workspaceId);
  for (const member of members) {
    await removeWorkspaceMember(workspaceId, member.userId.toString());
  }

  await deleteWorkspace(workspaceId);
  revalidatePath("/dashboard");
  return { ok: true };
}