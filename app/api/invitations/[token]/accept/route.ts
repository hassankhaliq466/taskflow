import { auth } from "@/lib/auth";
import {
  deleteInvitationByToken,
  findInvitationByToken,
} from "@/models/Invitation";
import { findWorkspaceById } from "@/models/Workspace";
import {
  addWorkspaceMember,
  findWorkspaceMember,
} from "@/models/WorkspaceMember";
import { withApiErrorHandling } from "@/lib/api-error";

async function acceptInvitation(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Sign in to accept this invitation" }, { status: 401 });
  }

  const { token } = await params;
  const invitation = await findInvitationByToken(token);
  if (!invitation) {
    return Response.json({ error: "This invitation is invalid or has expired" }, { status: 404 });
  }

  const userEmail = session.user.email?.trim().toLowerCase();
  if (!userEmail || userEmail !== invitation.email) {
    return Response.json(
      { error: `This invitation was sent to ${invitation.email}. Sign in with that email address.` },
      { status: 403 },
    );
  }

  const workspaceId = invitation.workspaceId.toString();
  const workspace = await findWorkspaceById(workspaceId);
  if (!workspace) {
    await deleteInvitationByToken(token);
    return Response.json({ error: "The invited workspace no longer exists" }, { status: 404 });
  }

  const existingMembership = await findWorkspaceMember(workspaceId, session.user.id);
  if (!existingMembership) {
    await addWorkspaceMember(workspaceId, session.user.id, invitation.role);
  }
  await deleteInvitationByToken(token);

  return Response.json({ ok: true, workspaceId });
}

export const POST = withApiErrorHandling(
  "POST /api/invitations/[token]/accept",
  acceptInvitation,
);
