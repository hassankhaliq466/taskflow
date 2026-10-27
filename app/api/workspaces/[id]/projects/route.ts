import { auth } from "@/lib/auth";
import { findProjectsByWorkspaceId } from "@/models/Project";
import { createProjectAction } from "@/lib/actions/project";
import { withApiErrorHandling } from "@/lib/api-error";

async function getWorkspaceProjects(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const projects = await findProjectsByWorkspaceId(id);
  return Response.json({ ok: true, data: { projects } });
}

async function createWorkspaceProject(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = await createProjectAction(id, body);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true, data: { projectId: result.projectId } });
}

export const GET = withApiErrorHandling(
  "GET /api/workspaces/[id]/projects",
  getWorkspaceProjects,
);
export const POST = withApiErrorHandling(
  "POST /api/workspaces/[id]/projects",
  createWorkspaceProject,
);