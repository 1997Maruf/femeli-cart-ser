import { MongoClient, Db, Collection } from 'mongodb';
import { SurveyData, AdminUser } from "./types.js";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

const DB_NAME = process.env.DB_NAME || 'jorip';
export const COLLECTION_NAME = 'family_card_survey';
export const ADMIN_USERS_COLLECTION = 'admin_users';

const DEFAULT_MONGODB_URI = 'mongodb+srv://jorip:MarufHossen1234@cluster0.a87xhva.mongodb.net/jorip?retryWrites=true&w=majority&appName=Cluster0';

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  const uri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined.');
  }

  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
  });

  await client.connect();
  const db = client.db(DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export async function getSurveyCollection(): Promise<Collection<SurveyData>> {
  const { db } = await connectToDatabase();
  return db.collection<SurveyData>(COLLECTION_NAME);
}

export async function getAdminUsersCollection(): Promise<Collection<AdminUser>> {
  const { db } = await connectToDatabase();
  return db.collection<AdminUser>(ADMIN_USERS_COLLECTION);
}
