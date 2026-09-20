import { Db, Collection } from "mongodb";
import clientPromise from "@/lib/db";

export interface User {
  _id?: string;
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
  return { ...user, _id: result.insertedId.toString() };
}