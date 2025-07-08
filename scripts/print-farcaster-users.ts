import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { NOT: { fid: null } },
    select: { id: true, fid: true, username: true }
  });
  console.log('Farcaster users:', users);

  for (const user of users) {
    const progress = await prisma.readingProgress.findMany({
      where: { userId: user.id }
    });
    console.log(`User ${user.username} (fid: ${user.fid}) reading progress:`, progress);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
