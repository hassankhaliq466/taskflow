import { Db, Collection, ObjectId } from "mongodb";
import clientPromise from "@/lib/db";

export type WorkspaceRole = "owner" | "admin" | "member";

export interface WorkspaceMember {
  _id?: ObjectId;
  workspaceId: ObjectId;
  userId: ObjectId;
  role: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
}

export async function getWorkspaceMemberCollection(): Promise<Collection<WorkspaceMember>> {
  const client = await clientPromise;
  const db: Db = client.db(process.env.MONGODB_DB || "taskflow");
  return db.collection<WorkspaceMember>("workspace_members");
}

export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<WorkspaceMember> {
  const collection = await getWorkspaceMemberCollection();
  const now = new Date();
  const member: WorkspaceMember = {
    workspaceId: new ObjectId(workspaceId),
    userId: new ObjectId(userId),
    role,
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection.insertOne(member);
  return { ...member, _id: result.insertedId };
}

export async function findWorkspaceMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
  const collection = await getWorkspaceMemberCollection();
  return collection.findOne({
    workspaceId: new ObjectId(workspaceId),
    userId: new ObjectId(userId),
  });
}

export async function findWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const collection = await getWorkspaceMemberCollection();
  return collection.find({ workspaceId: new ObjectId(workspaceId) }).toArray();
}

export async function findUserWorkspaces(userId: string): Promise<WorkspaceMember[]> {
  const collection = await getWorkspaceMemberCollection();
  return collection.find({ userId: new ObjectId(userId) }).toArray();
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<void> {
  const collection = await getWorkspaceMemberCollection();
  await collection.updateOne(
    { workspaceId: new ObjectId(workspaceId), userId: new ObjectId(userId) },
    { $set: { role, updatedAt: new Date() } }
  );
}

export async function removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
  const collection = await getWorkspaceMemberCollection();
  await collection.deleteOne({
    workspaceId: new ObjectId(workspaceId),
    userId: new ObjectId(userId),
  });
}

export async function isWorkspaceOwner(workspaceId: string, userId: string): Promise<boolean> {
  const member = await findWorkspaceMember(workspaceId, userId);
  return member?.role === "owner";
}

export async function isWorkspaceAdmin(workspaceId: string, userId: string): Promise<boolean> {
  const member = await findWorkspaceMember(workspaceId, userId);
  return member?.role === "owner" || member?.role === "admin";
}