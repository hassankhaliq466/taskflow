import { auth } from "@/lib/auth";
import { removeWorkspaceMemberAction, changeWorkspaceMemberRoleAction } from "@/lib/actions/workspace";
import { withApiErrorHandling } from "@/lib/api-error";

async function deleteWorkspaceMember(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id, memberId } = await params;
  const result = await removeWorkspaceMemberAction(id, memberId);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}

async function updateWorkspaceMember(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id, memberId } = await params;
  const body = await request.json();
  const result = await changeWorkspaceMemberRoleAction(id, memberId, body.role);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}

export const DELETE = withApiErrorHandling(
  "DELETE /api/workspaces/[id]/members/[memberId]",
  deleteWorkspaceMember,
);
export const PATCH = withApiErrorHandling(
  "PATCH /api/workspaces/[id]/members/[memberId]",
  updateWorkspaceMember,
);