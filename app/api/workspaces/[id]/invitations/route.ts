import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { createInvitation, deleteInvitationByToken, findWorkspaceInvitation } from "@/models/Invitation";
import { sendInvitationEmail } from "@/lib/email";
import { getSessionUser } from "@/lib/auth";
import { findWorkspaceById, isWorkspaceAdmin, isMember } from "@/models/Workspace";
import { findUserByEmail } from "@/models/User";
import { withApiErrorHandling } from "@/lib/api-error";

async function createWorkspaceInvitation(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid workspace ID" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user?._id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await isWorkspaceAdmin(id, user._id.toString()))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const workspace = await findWorkspaceById(id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, role } = body as { email?: unknown; role?: unknown };
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (role !== "member" && role !== "admin") {
    return NextResponse.json({ error: "Choose a valid workspace role" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const invitedUser = await findUserByEmail(normalizedEmail);
  if (invitedUser?._id && await isMember(id, invitedUser._id.toString())) {
    return NextResponse.json({ error: "This user is already a workspace member" }, { status: 409 });
  }
  const pendingInvitation = await findWorkspaceInvitation(new ObjectId(id), normalizedEmail);
  if (pendingInvitation) {
    return NextResponse.json({ error: "An invitation has already been sent to this email" }, { status: 409 });
  }

  const invitation = await createInvitation({
    workspaceId: new ObjectId(id),
    invitedBy: user._id,
    email: normalizedEmail,
    role,
  });

  try {
    await sendInvitationEmail({
      to: invitation.email,
      inviterName: user.name ?? user.email,
      workspaceName: workspace.name,
      token: invitation.token,
    });
  } catch (error) {
    console.error("Failed to send workspace invitation:", error);
    await deleteInvitationByToken(invitation.token);
    return NextResponse.json(
      { error: "Could not send the invitation email. Check the email service configuration and try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export const POST = withApiErrorHandling(
  "POST /api/workspaces/[id]/invitations",
  createWorkspaceInvitation,
);