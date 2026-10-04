import { auth } from "@/lib/auth";
import { listMyWorkspacesAction } from "@/lib/actions/workspace";
import { createWorkspaceAction } from "@/lib/actions/workspace";

export async function GET() {
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

export async function POST(request: Request) {
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