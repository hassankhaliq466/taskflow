import { Db, Collection, Filter, ObjectId } from "mongodb";
import clientPromise from "@/lib/db";

export interface Project {
  _id?: ObjectId;
  workspaceId: ObjectId;
  name: string;
  description: string;
  status: string;
  color: string;
  progress: number;
  due: string;
  dueDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getProjectCollection(): Promise<Collection<Project>> {
  const client = await clientPromise;
  const db: Db = client.db(process.env.MONGODB_DB || "taskflow");
  return db.collection<Project>("projects");
}

export async function createProject(
  workspaceId: string,
  input: Omit<Project, "_id" | "workspaceId" | "createdAt" | "updatedAt" | "progress">
): Promise<Project> {
  const collection = await getProjectCollection();
  const now = new Date();
  const project: Project = {
    workspaceId: new ObjectId(workspaceId),
    name: input.name,
    description: input.description,
    status: input.status,
    color: input.color,
    due: input.due,
    ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
    progress: input.status === "Completed" ? 100 : 0,
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection.insertOne(project);
  return { ...project, _id: result.insertedId };
}

export async function findProjectById(id: string): Promise<Project | null> {
  const collection = await getProjectCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function findProjectsByWorkspaceId(workspaceId: string): Promise<Project[]> {
  const collection = await getProjectCollection();
  const filter = {
    workspaceId: { $in: [new ObjectId(workspaceId), workspaceId] },
  } as unknown as Filter<Project>;
  return collection.find(filter).toArray();
}

export async function updateProject(id: string, patch: Partial<Omit<Project, "_id" | "workspaceId" | "createdAt">>): Promise<void> {
  const collection = await getProjectCollection();
  const update: Partial<Project> = { ...patch, updatedAt: new Date() };
  
  if (patch.status === "Completed") {
    update.progress = 100;
  } else if (patch.status && patch.status !== "Completed") {
    update.progress = 0;
  }
  
  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  );
}

export async function deleteProject(id: string): Promise<void> {
  const collection = await getProjectCollection();
  await collection.deleteOne({ _id: new ObjectId(id) });
}