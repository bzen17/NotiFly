import { MongoClient, Db } from 'mongodb';
import { MONGO_URI, MONGO_DB } from '../config';

let client: MongoClient | null = null;

export async function getMongo(): Promise<Db> {
  if (client && client.isConnected && (client as any).topology) {
    return client.db(MONGO_DB);
  }

  client = new MongoClient(MONGO_URI);
  await client.connect();
  return client.db(MONGO_DB);
}

export async function closeMongo() {
  if (client) await client.close();
}
