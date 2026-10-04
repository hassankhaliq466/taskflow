import { auth } from "@/lib/auth";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/db";
import { inviteWorkspaceMemberAction } from "@/lib/actions/workspace";
import { findWorkspaceMembers } from "@/models/WorkspaceMember";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const memberships = await findWorkspaceMembers(id);
  const userIds = memberships.map((member) => member.userId);
  const client = await clientPromise;
  const users = await client
    .db(process.env.MONGODB_DB || "taskflow")
    .collection<{ _id: ObjectId; name?: string; email?: string }>("users")
    .find({ _id: { $in: userIds } }, { projection: { name: 1, email: 1 } })
    .toArray();
  const userById = new Map(users.map((user) => [user._id.toString(), user]));
  const members = memberships.map((membership) => {
    const memberId = membership.userId.toString();
    const user = userById.get(memberId);
    const name = user?.name?.trim() || user?.email || "Unknown member";

    return {
      id: memberId,
      workspaceId: membership.workspaceId.toString(),
      name,
      email: user?.email ?? "",
      role: membership.role,
      initials: name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join(""),
    };
  });

  return Response.json({ ok: true, data: { members } });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = await inviteWorkspaceMemberAction(id, body.email, body.role);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true });
}