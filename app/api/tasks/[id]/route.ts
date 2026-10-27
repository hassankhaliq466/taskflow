import { auth } from "@/lib/auth";
import { updateTaskAction, deleteTaskAction, updateTaskStatusAction } from "@/lib/actions/task";
import { withApiErrorHandling } from "@/lib/api-error";

async function updateTaskRoute(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  
  if (body.status && Object.keys(body).length === 1) {
    const result = await updateTaskStatusAction(id, body.status);
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 400 });
    }
    return Response.json({ ok: true });
  }

  const result = await updateTaskAction(id, body);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}

async function deleteTaskRoute(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const result = await deleteTaskAction(id);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}

export const PATCH = withApiErrorHandling(
  "PATCH /api/tasks/[id]",
  updateTaskRoute,
);
export const DELETE = withApiErrorHandling(
  "DELETE /api/tasks/[id]",
  deleteTaskRoute,
);