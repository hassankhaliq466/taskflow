import { Db, Collection, ObjectId } from "mongodb";
import clientPromise from "@/lib/db";

export type ProjectRole = "admin" | "member";

export interface ProjectMember {
  _id?: ObjectId;
  projectId: ObjectId;
  userId: ObjectId;
  role: ProjectRole;
  createdAt: Date;
  updatedAt: Date;
}

export async function getProjectMemberCollection(): Promise<Collection<ProjectMember>> {
  const client = await clientPromise;
  const db: Db = client.db(process.env.MONGODB_DB || "taskflow");
  return db.collection<ProjectMember>("project_members");
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: ProjectRole
): Promise<ProjectMember> {
  const collection = await getProjectMemberCollection();
  const now = new Date();
  const member: ProjectMember = {
    projectId: new ObjectId(projectId),
    userId: new ObjectId(userId),
    role,
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection.insertOne(member);
  return { ...member, _id: result.insertedId };
}

export async function findProjectMember(projectId: string, userId: string): Promise<ProjectMember | null> {
  const collection = await getProjectMemberCollection();
  return collection.findOne({
    projectId: new ObjectId(projectId),
    userId: new ObjectId(userId),
  });
}

export async function findProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const collection = await getProjectMemberCollection();
  return collection.find({ projectId: new ObjectId(projectId) }).toArray();
}

export async function findUserProjects(userId: string): Promise<ProjectMember[]> {
  const collection = await getProjectMemberCollection();
  return collection.find({ userId: new ObjectId(userId) }).toArray();
}

export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: ProjectRole
): Promise<void> {
  const collection = await getProjectMemberCollection();
  await collection.updateOne(
    { projectId: new ObjectId(projectId), userId: new ObjectId(userId) },
    { $set: { role, updatedAt: new Date() } }
  );
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  const collection = await getProjectMemberCollection();
  await collection.deleteOne({
    projectId: new ObjectId(projectId),
    userId: new ObjectId(userId),
  });
}

export async function isProjectAdmin(projectId: string, userId: string): Promise<boolean> {
  const member = await findProjectMember(projectId, userId);
  return member?.role === "admin";
}