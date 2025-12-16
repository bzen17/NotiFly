import { MongoClient } from 'mongodb';
import { MONGO_URI, MONGO_DB } from '../config';

const client = new MongoClient(MONGO_URI);

export async function connectMongo() {
  if (!client.isConnected?.()) {
    await client.connect();
  }
  // Use explicit DB name to avoid depending on URI parsing differences between services
  const db = client.db(MONGO_DB);
  console.log('Connected to MongoDB', { uri: MONGO_URI, db: MONGO_DB });
  return db;
}

export async function closeMongo() {
  await client.close();
}
