const Database = require('better-sqlite3');
const db = new Database('dev.db');

(function main() {
  const getUser = db.prepare(`SELECT id FROM "User" LIMIT 1`);
  const u = getUser.get();
  if (!u) {
    console.error('No user found — run seed first');
    process.exit(1);
  }

  const update = db.prepare(`
    UPDATE "HourLog"
    SET userId = ?, rigName = COALESCE(rigName, ''), wellNumber = COALESCE(wellNumber, '')
    WHERE userId IS NULL OR rigName IS NULL OR wellNumber IS NULL
  `);

  const res = update.run(u.id);
  console.log(`Backfilled ${res.changes} hour log(s) with userId ${u.id}`);
  db.close();
})();
