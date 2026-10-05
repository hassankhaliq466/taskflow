import { Db, Collection, ObjectId } from "mongodb";
import { randomBytes } from "crypto";
import clientPromise from "@/lib/db";
import type { WorkspaceRole } from "@/models/WorkspaceMember";

export type InvitationRole = Exclude<WorkspaceRole, "owner">;

export interface Invitation {
  _id?: ObjectId;
  workspaceId: ObjectId;   // <-- new
  email: string;
  token: string;
  role: InvitationRole;
  invitedBy: ObjectId;     // <-- new, useful for the email text
  expiresAt: Date;
  createdAt: Date;
}

let indexesReady: Promise<unknown> | null = null;

export async function getInvitationCollection(): Promise<Collection<Invitation>> {
  const client = await clientPromise;
  const db: Db = client.db(process.env.MONGODB_DB || "taskflow");
  const collection = db.collection<Invitation>("invitations");

  // createIndex is idempotent; run it once per server instance
  if (!indexesReady) {
    indexesReady = Promise.all([
      collection.createIndex({ token: 1 }, { unique: true }),
      collection.createIndex({ email: 1 }),
      // MongoDB auto-deletes the document once expiresAt passes
      collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).catch((err) => {
      indexesReady = null; // retry on next call
      throw err;
    });
  }
  await indexesReady;

  return collection;
}

export function generateInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createInvitation(data: {
  workspaceId: ObjectId;
  email: string;
  role?: InvitationRole;
  invitedBy: ObjectId;
  expiresInDays?: number;
}): Promise<Invitation> {
  const collection = await getInvitationCollection();
  const now = new Date();
  const invitation: Invitation = {
    workspaceId: data.workspaceId,
    email: data.email.toLowerCase(),
    token: generateInvitationToken(),
    role: data.role ?? "member",
    invitedBy: data.invitedBy,
    expiresAt: new Date(now.getTime() + (data.expiresInDays ?? 7) * 24 * 60 * 60 * 1000),
    createdAt: now,
  };
  const result = await collection.insertOne(invitation);
  return { ...invitation, _id: result.insertedId };
}

export async function findInvitationByToken(token: string): Promise<Invitation | null> {
  const collection = await getInvitationCollection();
  const invitation = await collection.findOne({ token });

  // TTL cleanup runs only about once a minute, so check expiry here too
  if (!invitation || invitation.expiresAt.getTime() < Date.now()) return null;
  return invitation;
}

export async function findInvitationsByEmail(email: string): Promise<Invitation[]> {
  const collection = await getInvitationCollection();
  return collection
    .find({ email: email.toLowerCase(), expiresAt: { $gt: new Date() } })
    .toArray();
}

export async function findWorkspaceInvitation(
  workspaceId: ObjectId,
  email: string,
): Promise<Invitation | null> {
  const collection = await getInvitationCollection();
  return collection.findOne({
    workspaceId,
    email: email.toLowerCase(),
    expiresAt: { $gt: new Date() },
  });
}

export async function deleteInvitation(id: string): Promise<void> {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid invitation ID");
  }

  const collection = await getInvitationCollection();
  await collection.deleteOne({ _id: new ObjectId(id) });
}

export async function deleteInvitationByToken(token: string): Promise<void> {
  const collection = await getInvitationCollection();
  await collection.deleteOne({ token });
}   