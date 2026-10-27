import { auth } from "@/lib/auth";
import { findProjectById } from "@/models/Project";
import { updateProjectAction, deleteProjectAction } from "@/lib/actions/project";
import { withApiErrorHandling } from "@/lib/api-error";

async function getProject(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const project = await findProjectById(id);
  if (!project) {
    return Response.json({ ok: false, error: "Project not found" }, { status: 404 });
  }

  return Response.json({ ok: true, data: { project } });
}

async function updateProjectRoute(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = await updateProjectAction(id, body);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}

async function deleteProjectRoute(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const result = await deleteProjectAction(id);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}

export const GET = withApiErrorHandling(
  "GET /api/projects/[id]",
  getProject,
);
export const PATCH = withApiErrorHandling(
  "PATCH /api/projects/[id]",
  updateProjectRoute,
);
export const DELETE = withApiErrorHandling(
  "DELETE /api/projects/[id]",
  deleteProjectRoute,
);