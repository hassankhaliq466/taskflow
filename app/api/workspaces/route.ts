import { auth } from "@/lib/auth";
import { listMyWorkspacesAction } from "@/lib/actions/workspace";
import { createWorkspaceAction } from "@/lib/actions/workspace";
import { withApiErrorHandling } from "@/lib/api-error";

async function getWorkspaces() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const result = await listMyWorkspacesAction();
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true, data: { workspaces: result.workspaces } });
}

async function createWorkspace(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const result = await createWorkspaceAction(body.name);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true, data: { workspaceId: result.workspaceId } });
}

export const GET = withApiErrorHandling("GET /api/workspaces", getWorkspaces);
export const POST = withApiErrorHandling(
  "POST /api/workspaces",
  createWorkspace,
);