import { Db, Collection, ObjectId } from "mongodb";
import clientPromise from "@/lib/db";
import { findWorkspaceMember } from "@/models/WorkspaceMember";

export interface Workspace {
  _id?: ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getWorkspaceCollection(): Promise<Collection<Workspace>> {
  const client = await clientPromise;
  const db: Db = client.db(process.env.MONGODB_DB || "taskflow");
  return db.collection<Workspace>("workspaces");
}

export async function createWorkspace(name: string, userId: string): Promise<Workspace> {
  const collection = await getWorkspaceCollection();
  const now = new Date();
  const workspace: Workspace = {
    name,
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection.insertOne(workspace);
  return { ...workspace, _id: result.insertedId };
}

export async function findWorkspaceById(id: string): Promise<Workspace | null> {
  const collection = await getWorkspaceCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function findWorkspacesByUserId(userId: string): Promise<Workspace[]> {
  const collection = await getWorkspaceCollection();
  return collection.find({}).toArray();
}

export async function updateWorkspace(id: string, patch: Partial<Workspace>): Promise<void> {
  const collection = await getWorkspaceCollection();
  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...patch, updatedAt: new Date() } }
  );
}

export async function deleteWorkspace(id: string): Promise<void> {
  const collection = await getWorkspaceCollection();
  await collection.deleteOne({ _id: new ObjectId(id) });
}

export async function isWorkspaceAdmin(workspaceId: string, userId: string): Promise<boolean> {
  const member = await findWorkspaceMember(workspaceId, userId);
  return member?.role === "owner" || member?.role === "admin";
}

export async function isMember(workspaceId: string, userId: string): Promise<boolean> {
  return (await findWorkspaceMember(workspaceId, userId)) !== null;
}