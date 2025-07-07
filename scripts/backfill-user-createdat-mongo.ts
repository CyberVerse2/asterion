import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function main() {
  const uri = process.env.DATABASE_URL!;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const users = db.collection('User');
  const readingProgress = db.collection('reading_progress');

  const now = new Date();

  // Iterate over all users and forcibly set createdAt to a BSON Date
  const cursor = users.find({});
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
    let createdAt = rp[0]?.lastReadAt || now;
    // If user.createdAt exists, try to parse it as a Date
    if (user.createdAt) {
      if (user.createdAt instanceof Date) {
        createdAt = user.createdAt;
      } else if (typeof user.createdAt === 'string' || typeof user.createdAt === 'number') {
        const parsed = new Date(user.createdAt);
        if (!isNaN(parsed.getTime())) {
          createdAt = parsed;
        }
      }
    }
    await users.updateOne({ _id: user._id }, { $set: { createdAt: new Date(createdAt) } });
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
