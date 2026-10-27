import { auth } from "@/lib/auth";
import { findProjectMembers } from "@/models/ProjectMember";
import { addProjectMemberAction } from "@/lib/actions/project";
import { withApiErrorHandling } from "@/lib/api-error";

async function getProjectMembers(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const memberships = await findProjectMembers(id);
  const members = memberships.map((membership) => ({
    projectId: membership.projectId.toString(),
    memberId: membership.userId.toString(),
    role: membership.role,
  }));
  return Response.json({ ok: true, data: { members } });
}

async function addProjectMember(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = await addProjectMemberAction(id, body.userId, body.role);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}

export const GET = withApiErrorHandling(
  "GET /api/projects/[id]/members",
  getProjectMembers,
);
export const POST = withApiErrorHandling(
  "POST /api/projects/[id]/members",
  addProjectMember,
);