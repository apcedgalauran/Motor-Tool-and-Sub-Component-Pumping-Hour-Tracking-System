import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find a seeded user to attribute existing logs to (Rei or any first user)
  const user = await prisma.user.findFirst({ where: { email: 'rei@motortracker.app' } })
    || await prisma.user.findFirst();
  if (!user) {
    console.error('No users found — run the seed first');
    process.exit(1);
  }

  // Backfill hour logs that have null userId or rig/well
  const res = await prisma.hourLog.updateMany({
    where: { OR: [{ userId: null }, { rigName: null }, { wellNumber: null }] },
    data: {
      userId: user.id,
      rigName: '',
      wellNumber: '',
    },
  });

  console.log(`Backfilled ${res.count} hour log(s) with user ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
