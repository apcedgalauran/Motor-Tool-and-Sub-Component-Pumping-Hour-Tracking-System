const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('dev.db');

(async function main() {
  const users = [
    { name: 'Rei',    email: 'rei@motortracker.app',    password: 'password' },
    { name: 'Norman', email: 'norman@motortracker.app', password: 'password' },
  ];

  const insert = db.prepare(`
    INSERT INTO "User" (name, email, passwordHash)
    VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET name=excluded.name, passwordHash=excluded.passwordHash;
  `);

  const { randomUUID } = require('crypto');
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    const id = randomUUID();
    // Insert with generated id because Prisma's cuid() default is not available at SQL level
    db.prepare(`
      INSERT INTO "User" (id, name, email, passwordHash)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET name=excluded.name, passwordHash=excluded.passwordHash;
    `).run(id, u.name, u.email, hash);
  }

  console.log('Seeded users into SQLite dev.db');
  db.close();
})();
