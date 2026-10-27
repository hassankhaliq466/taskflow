import { auth } from "@/lib/auth";
import { deleteWorkspaceAction, updateWorkspaceAction } from "@/lib/actions/workspace";
import { withApiErrorHandling } from "@/lib/api-error";

async function deleteWorkspace(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const result = await deleteWorkspaceAction(id);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}

async function updateWorkspace(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = await updateWorkspaceAction(id, body);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}

export const DELETE = withApiErrorHandling(
  "DELETE /api/workspaces/[id]",
  deleteWorkspace,
);
export const PATCH = withApiErrorHandling(
  "PATCH /api/workspaces/[id]",
  updateWorkspace,
);