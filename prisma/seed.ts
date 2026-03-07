import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const users = [
    { name: 'Rei',    email: 'rei@motortracker.app',    password: 'password' },
    { name: 'Norman', email: 'norman@motortracker.app', password: 'password' },
  ];
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, passwordHash },
    });
  }
  console.log('Seeded 2 users.');
}

main().finally(() => prisma.$disconnect());
