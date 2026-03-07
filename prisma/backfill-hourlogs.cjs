const { PrismaClient } = require('@prisma/client');

const AdapterSqlitePkg = require('@prisma/adapter-better-sqlite3');
const AdapterPgPkg = require('@prisma/adapter-pg');

const PrismaBetterSqlite3 = AdapterSqlitePkg.PrismaBetterSqlite3 || AdapterSqlitePkg.default || AdapterSqlitePkg;
const PrismaPg = AdapterPgPkg.PrismaPg || AdapterPgPkg.default || AdapterPgPkg;

const connectionString = process.env.DATABASE_URL || '';
let prisma;
if (connectionString.startsWith('file:') || connectionString.includes('sqlite')) {
  const adapter = new PrismaBetterSqlite3({ url: connectionString });
  prisma = new PrismaClient({ adapter, log: ['query', 'info', 'warn', 'error'] });
} else if (connectionString.startsWith('postgres')) {
  const adapter = new PrismaPg({ connectionString });
  prisma = new PrismaClient({ adapter, log: ['query', 'info', 'warn', 'error'] });
} else {
  prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });
}

(async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'rei@motortracker.app' } }) || await prisma.user.findFirst();
  if (!user) {
    console.error('No users found — run the seed first');
    process.exit(1);
  }

  const res = await prisma.hourLog.updateMany({
    where: { OR: [{ userId: null }, { rigName: null }, { wellNumber: null }] },
    data: {
      userId: user.id,
      rigName: '',
      wellNumber: '',
    },
  });

  console.log(`Backfilled ${res.count} hour log(s) with user ${user.email}`);
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
