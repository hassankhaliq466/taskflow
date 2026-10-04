import { findWorkspaceMember } from "@/models/WorkspaceMember";
import { findProjectMember } from "@/models/ProjectMember";

export type WorkspaceRole = "member" | "admin" | "owner";
export type ProjectRole = "member" | "admin";

const workspaceRoleOrder: WorkspaceRole[] = ["member", "admin", "owner"];
const projectRoleOrder: ProjectRole[] = ["member", "admin"];

function hasMinRole(userRole: string, minRole: string, roleOrder: string[]): boolean {
  const userIndex = roleOrder.indexOf(userRole);
  const minIndex = roleOrder.indexOf(minRole);
  return userIndex >= minIndex;
}

export async function requireWorkspaceRole(
  userId: string,
  workspaceId: string,
  minRole: WorkspaceRole
): Promise<{ ok: true } | { ok: false; error: string }> {
  const member = await findWorkspaceMember(workspaceId, userId);
  
  if (!member) {
    return { ok: false, error: "Not a member of this workspace" };
  }
  
  if (!hasMinRole(member.role, minRole, workspaceRoleOrder)) {
    return { ok: false, error: `Requires ${minRole} role or higher` };
  }
  
  return { ok: true };
}

export async function requireProjectRole(
  userId: string,
  projectId: string,
  minRole: ProjectRole
): Promise<{ ok: true } | { ok: false; error: string }> {
  const member = await findProjectMember(projectId, userId);
  
  if (!member) {
    return { ok: false, error: "Not a member of this project" };
  }
  
  if (!hasMinRole(member.role, minRole, projectRoleOrder)) {
    return { ok: false, error: `Requires ${minRole} role or higher` };
  }
  
  return { ok: true };
}