import { Db, Collection, ObjectId } from "mongodb";
import clientPromise from "@/lib/db";

export interface User {
  _id?: ObjectId;
  email: string;
  password: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getUserCollection(): Promise<Collection<User>> {
  const client = await clientPromise;
  const db: Db = client.db(process.env.MONGODB_DB || "taskflow");
  return db.collection<User>("users");
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const collection = await getUserCollection();
  return collection.findOne({ email: email.toLowerCase() });
}

export async function findUserById(id: string): Promise<User | null> {
  if (!ObjectId.isValid(id)) return null;

  const collection = await getUserCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function updateUserProfile(
  id: string,
  profile: { name: string; email: string },
): Promise<void> {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid user ID");
  }

  const collection = await getUserCollection();
  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...profile, updatedAt: new Date() } },
  );
}

export async function createUser(userData: Omit<User, "_id" | "createdAt" | "updatedAt">): Promise<User> {
  const collection = await getUserCollection();
  const now = new Date();
  const user: User = {
    ...userData,
    email: userData.email.toLowerCase(),
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection.insertOne(user);
  return { ...user, _id: result.insertedId };
}