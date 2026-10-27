import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error("Please add your MongoDB URI to .env.local");
}

async function connectAndIndex(client: MongoClient): Promise<MongoClient> {
  const connectedClient = await client.connect();
  const db = connectedClient.db(process.env.MONGODB_DB || "taskflow");
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }),
    db.collection("workspace_members").createIndex({ workspaceId: 1, userId: 1 }),
    db.collection("workspace_members").createIndex({ userId: 1, workspaceId: 1 }),
    db.collection("projects").createIndex({ workspaceId: 1 }),
    db.collection("project_members").createIndex({ projectId: 1, userId: 1 }),
    db.collection("tasks").createIndex({ projectId: 1 }),
  ]);
  return connectedClient;
}

if (process.env.NODE_ENV === "development") {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = connectAndIndex(
      new MongoClient(uri, options),
    );
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  clientPromise = connectAndIndex(new MongoClient(uri, options));
}

export default clientPromise;