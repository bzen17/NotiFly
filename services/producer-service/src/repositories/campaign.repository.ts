export async function insertEvent(mongo: any, event: any) {
  const collection = (mongo as any).db
    ? (mongo as any).db().collection('campaigns')
    : (mongo as any).collection('campaigns');
  return collection.insertOne(event);
}

export async function findById(mongo: any, id: string) {
  const collection = (mongo as any).db
    ? (mongo as any).db().collection('campaigns')
    : (mongo as any).collection('campaigns');
  return collection.findOne({ _id: id });
}

export async function list(mongo: any, { skip = 0, limit = 20, filter = {} }: any) {
  const collection = (mongo as any).db
    ? (mongo as any).db().collection('campaigns')
    : (mongo as any).collection('campaigns');
  const query = filter || {};
  const cursor = collection
    .find(query)
    .sort({ createdAt: -1 })
    .skip(Number(skip))
    .limit(Number(limit));
  const items = await cursor.toArray();
  // map to stable shape
  return items.map((it: any) => ({
    _id: it._id,
    name: it.name,
    channel: it.channel,
    recipients: it.recipients,
    payload: it.payload,
    status: it.status,
    createdAt: it.createdAt,
    scheduleAt: it.scheduleAt,
    meta: it.meta || {},
  }));
}

export default { insertEvent, findById, list };
