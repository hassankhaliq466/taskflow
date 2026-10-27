import { Db, Collection, Filter, ObjectId } from "mongodb";
import clientPromise from "@/lib/db";

export type TaskType = "task" | "bug" | "feature";
export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  _id?: ObjectId;
  projectId: ObjectId;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeId: ObjectId | null;
  dueDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function getTaskCollection(): Promise<Collection<Task>> {
  const client = await clientPromise;
  const db: Db = client.db(process.env.MONGODB_DB || "taskflow");
  return db.collection<Task>("tasks");
}

export async function createTask(
  projectId: string,
  input: Omit<Task, "_id" | "projectId" | "createdAt" | "updatedAt">
): Promise<Task> {
  const collection = await getTaskCollection();
  const now = new Date();
  const task: Task = {
    projectId: new ObjectId(projectId),
    title: input.title,
    description: input.description,
    type: input.type,
    priority: input.priority,
    status: input.status,
    assigneeId: input.assigneeId ? new ObjectId(input.assigneeId) : null,
    dueDate: input.dueDate,
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection.insertOne(task);
  return { ...task, _id: result.insertedId };
}

export async function findTaskById(id: string): Promise<Task | null> {
  const collection = await getTaskCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function findTasksByProjectId(projectId: string): Promise<Task[]> {
  const collection = await getTaskCollection();
  const filter = {
    projectId: { $in: [new ObjectId(projectId), projectId] },
  } as unknown as Filter<Task>;
  return collection.find(filter).toArray();
}

export async function updateTask(
  id: string,
  patch: Partial<Omit<Task, "_id" | "projectId" | "createdAt">>
): Promise<void> {
  const collection = await getTaskCollection();
  const update: Partial<Task> = { ...patch, updatedAt: new Date() };
  
  if (patch.assigneeId) {
    update.assigneeId = new ObjectId(patch.assigneeId);
  }
  
  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  );
}

export async function deleteTask(id: string): Promise<void> {
  const collection = await getTaskCollection();
  await collection.deleteOne({ _id: new ObjectId(id) });
}

export async function deleteTasksByProjectId(projectId: string): Promise<void> {
  const collection = await getTaskCollection();
  const filter = {
    projectId: { $in: [new ObjectId(projectId), projectId] },
  } as unknown as Filter<Task>;
  await collection.deleteMany(filter);
}