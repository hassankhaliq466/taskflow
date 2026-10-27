import { auth } from "@/lib/auth";
import { removeProjectMemberAction, changeProjectMemberRoleAction } from "@/lib/actions/project";
import { withApiErrorHandling } from "@/lib/api-error";

async function deleteProjectMember(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id, memberId } = await params;
  const result = await removeProjectMemberAction(id, memberId);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}

async function updateProjectMember(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id, memberId } = await params;
  const body = await request.json();
  const result = await changeProjectMemberRoleAction(id, memberId, body.role);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}

export const DELETE = withApiErrorHandling(
  "DELETE /api/projects/[id]/members/[memberId]",
  deleteProjectMember,
);
export const PATCH = withApiErrorHandling(
  "PATCH /api/projects/[id]/members/[memberId]",
  updateProjectMember,
);