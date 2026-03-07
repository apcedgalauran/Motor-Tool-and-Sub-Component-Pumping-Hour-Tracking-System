const Database = require('better-sqlite3');
const db = new Database('dev.db', { readonly: true });

function iso(d) { return d ? new Date(d).toISOString() : null }

const rows = db.prepare(`
  SELECT a.id as assemblyId, a.subComponentId, sc.serialNumber as scSerial, sc.type as scType,
         a.motorId, m.name as motorName, m.serialNumber as motorSerial, m.pumpingHours as motorPumpingHours,
         a.dateAssembled, a.dateRemoved, a.hoursAtAssembly, a.hoursAtRemoval, a.hoursAccrued
  FROM Assembly a
  LEFT JOIN Motor m ON a.motorId = m.id
  LEFT JOIN SubComponent sc ON a.subComponentId = sc.id
  ORDER BY a.dateAssembled DESC
  LIMIT 200
`).all();

// Collect motor IDs and fetch their hour logs
const motorIds = [...new Set(rows.map(r => r.motorId).filter(Boolean))];
const logsByMotor = {};
if (motorIds.length > 0) {
  const placeholders = motorIds.map(() => '?').join(',');
  const logs = db.prepare(`
    SELECT id, motorId, hoursAdded, totalAfter, rigName, wellNumber, notes, createdAt
    FROM HourLog
    WHERE motorId IN (${placeholders})
    ORDER BY createdAt ASC
  `).all(...motorIds);

  for (const l of logs) {
    if (!logsByMotor[l.motorId]) logsByMotor[l.motorId] = [];
    logsByMotor[l.motorId].push(l);
  }
}

const out = { assemblies: rows, hourLogs: logsByMotor };
console.log(JSON.stringify(out, null, 2));
db.close();
