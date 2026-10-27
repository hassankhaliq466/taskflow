import { auth } from "@/lib/auth";
import { findTasksByProjectId } from "@/models/Task";
import { createTaskAction } from "@/lib/actions/task";
import { withApiErrorHandling } from "@/lib/api-error";

async function getProjectTasks(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const tasks = await findTasksByProjectId(id);
  return Response.json({ ok: true, data: { tasks } });
}

async function createProjectTask(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = await createTaskAction(id, body);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true, data: { taskId: result.taskId } });
}

export const GET = withApiErrorHandling(
  "GET /api/projects/[id]/tasks",
  getProjectTasks,
);
export const POST = withApiErrorHandling(
  "POST /api/projects/[id]/tasks",
  createProjectTask,
);