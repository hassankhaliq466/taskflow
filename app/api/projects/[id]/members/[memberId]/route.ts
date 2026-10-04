import { auth } from "@/lib/auth";
import { removeProjectMemberAction, changeProjectMemberRoleAction } from "@/lib/actions/project";

export async function DELETE(
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

export async function PATCH(
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