import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  // Find users with missing or null createdAt
  const users = await prisma.user.findMany({
    where: { OR: [{ createdAt: null }, { createdAt: { equals: undefined } }] },
    select: { id: true }
  });
  if (users.length === 0) {
    console.log('No users need backfilling.');
    return;
  }
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { createdAt: now }
    });
    console.log(`Backfilled user ${user.id}`);
  }
  console.log(`Backfilled ${users.length} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
