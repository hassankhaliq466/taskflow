"use server";

import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { requireProjectRole } from "@/lib/permissions";
import {
  createTask,
  findTaskById,
  updateTask,
  deleteTask,
} from "@/models/Task";
import { findProjectById } from "@/models/Project";
import { findProjectMember } from "@/models/ProjectMember";
import { revalidatePath } from "next/cache";

async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function createTaskAction(
  projectId: string,
  input: {
    title: string;
    description: string;
    type: "task" | "bug" | "feature";
    priority: "low" | "medium" | "high";
    status: "todo" | "in-progress" | "done";
    assigneeId: string | null;
    dueDate: string | null;
  }
): Promise<{ ok: true; taskId: string } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const perm = await requireProjectRole(userId, projectId, "admin");
  if (!perm.ok) return { ok: false, error: perm.error };

  const project = await findProjectById(projectId);
  if (!project) return { ok: false, error: "Project not found" };

  const trimmed = input.title.trim();
  if (!trimmed) return { ok: false, error: "Task title is required" };

  const task = await createTask(projectId, {
    ...input,
    title: trimmed,
    assigneeId: input.assigneeId ? new ObjectId(input.assigneeId) : null,
  });

  revalidatePath(`/project/${projectId}`);
  return { ok: true, taskId: task._id!.toString() };
}

export async function updateTaskAction(
  taskId: string,
  patch: {
    title?: string;
    description?: string;
    type?: "task" | "bug" | "feature";
    priority?: "low" | "medium" | "high";
    status?: "todo" | "in-progress" | "done";
    assigneeId?: string | null;
    dueDate?: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const task = await findTaskById(taskId);
  if (!task) return { ok: false, error: "Task not found" };

  const perm = await requireProjectRole(userId, task.projectId.toString(), "admin");
  if (!perm.ok) return { ok: false, error: perm.error };

  if (patch.title !== undefined) {
    const trimmed = patch.title.trim();
    if (!trimmed) return { ok: false, error: "Task title cannot be empty" };
    patch.title = trimmed;
  }

  let updateData = { ...patch };
  if (patch.assigneeId !== undefined && patch.assigneeId !== null) {
    const projectMember = await findProjectMember(task.projectId.toString(), patch.assigneeId);
    if (!projectMember) return { ok: false, error: "Assignee must be a project member" };
    updateData = { ...patch, assigneeId: patch.assigneeId };
  }

  await updateTask(taskId, updateData as Parameters<typeof updateTask>[1]);
  revalidatePath(`/project/${task.projectId.toString()}`);
  return { ok: true };
}

export async function deleteTaskAction(taskId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const task = await findTaskById(taskId);
  if (!task) return { ok: false, error: "Task not found" };

  const perm = await requireProjectRole(userId, task.projectId.toString(), "admin");
  if (!perm.ok) return { ok: false, error: perm.error };

  await deleteTask(taskId);
  revalidatePath(`/project/${task.projectId.toString()}`);
  return { ok: true };
}

export async function updateTaskStatusAction(
  taskId: string,
  status: "todo" | "in-progress" | "done"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const task = await findTaskById(taskId);
  if (!task) return { ok: false, error: "Task not found" };

  if (task.assigneeId?.toString() !== userId) {
    return { ok: false, error: "Can only update status of your own assigned tasks" };
  }

  const projectMember = await findProjectMember(task.projectId.toString(), userId);
  if (!projectMember) {
    return { ok: false, error: "Not a member of this project" };
  }

  await updateTask(taskId, { status });
  revalidatePath(`/project/${task.projectId.toString()}`);
  return { ok: true };
}