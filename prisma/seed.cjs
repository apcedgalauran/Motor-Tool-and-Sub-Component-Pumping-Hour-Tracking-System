const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

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
  const users = [
    { name: 'Rei',    email: 'rei@motortracker.app',    password: 'password' },
    { name: 'Norman', email: 'norman@motortracker.app', password: 'password' },
  ];
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, passwordHash },
    });
  }
  console.log('Seeded 2 users.');
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
