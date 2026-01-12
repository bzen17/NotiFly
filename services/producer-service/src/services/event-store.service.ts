import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;

export async function initEventStore(mongoUri: string) {
  if (client) return client;
  client = new MongoClient(mongoUri);
  await client.connect();
  return client;
}

export function getEventCollection(dbName: string) {
  if (!client) throw new Error('Event store not initialized');
  return client.db(dbName).collection('events');
}
