import { MongoClient } from 'mongodb';

async function main() {
  const uri = process.env.DATABASE_URL!;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const users = db.collection('User');
  const readingProgress = db.collection('reading_progress');

  const now = new Date();

  // Find users with missing or null createdAt
  const cursor = users.find({ $or: [{ createdAt: { $exists: false } }, { createdAt: null }] });
  let count = 0;
  while (await cursor.hasNext()) {
    const user = await cursor.next();
    if (!user) continue;
    // Find earliest reading progress for this user
    const rp = await readingProgress
      .find({ userId: user._id })
      .sort({ lastReadAt: 1 })
      .limit(1)
      .toArray();
    const createdAt = rp[0]?.lastReadAt || now;
    await users.updateOne({ _id: user._id }, { $set: { createdAt } });
    console.log(`Backfilled user ${user._id} with createdAt: ${createdAt}`);
    count++;
  }
  console.log(`Backfilled ${count} users.`);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
