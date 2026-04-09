import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupDir = path.resolve(__dirname, 'backup_data');

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '';
const isSqlite = connectionString.startsWith('file:') || connectionString.includes('sqlite');
const isPostgres = connectionString.startsWith('postgres');

const LEGACY_MOTOR_STATUS_MAP = {
  ACTIVE: 'ON_LOCATION',
  INACTIVE: 'IN_BASE',
  IN_MAINTENANCE: 'FOR_MAINTENANCE',
};

function createPrismaClient() {
  if (isSqlite) {
    const adapter = new PrismaBetterSqlite3({ url: connectionString });
    return new PrismaClient({ adapter });
  }

  if (isPostgres) {
    const adapter = new PrismaPg({ connectionString });
    return new PrismaClient({ adapter });
  }

  return new PrismaClient();
}

const prisma = createPrismaClient();

function parseArrayPayload(raw, label) {
  if (!Array.isArray(raw)) {
    throw new Error(`${label} must be a JSON array.`);
  }

  return raw;
}

function toDateOrNull(value) {
  if (!value) return null;

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function toNumberOrDefault(value, defaultValue = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function normalizeMotorStatus(status) {
  const trimmed = String(status ?? '').trim();
  if (!trimmed) return 'ON_LOCATION';

  return LEGACY_MOTOR_STATUS_MAP[trimmed] ?? trimmed;
}

async function readJsonArray(fileName, label) {
  const filePath = path.join(backupDir, fileName);
  const raw = await fs.readFile(filePath, 'utf8');
  return parseArrayPayload(JSON.parse(raw), label);
}

function createManyPayload(data) {
  if (isPostgres) {
    return { data, skipDuplicates: true };
  }

  return { data };
}

function normalizeUsers(rows) {
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    passwordHash: String(row.passwordHash),
    createdAt: toDateOrNull(row.createdAt) ?? new Date(),
  }));
}

function normalizeMotors(rows) {
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    serialNumber: String(row.serialNumber),
    location: row.location ? String(row.location) : null,
    dateOut: toDateOrNull(row.dateOut),
    dateIn: toDateOrNull(row.dateIn),
    status: normalizeMotorStatus(row.status),
    customStatusId: row.customStatusId ? String(row.customStatusId) : null,
    pumpingHours: toNumberOrDefault(row.pumpingHours),
    createdAt: toDateOrNull(row.createdAt) ?? new Date(),
    updatedAt: toDateOrNull(row.updatedAt) ?? new Date(),
  }));
}

function normalizeSubComponents(rows) {
  return rows.map((row) => ({
    id: String(row.id),
    type: String(row.type),
    serialNumber: String(row.serialNumber),
    cumulativeHours: toNumberOrDefault(row.cumulativeHours),
    status: String(row.status ?? 'AVAILABLE'),
    notes: row.notes ? String(row.notes) : null,
    createdAt: toDateOrNull(row.createdAt) ?? new Date(),
    updatedAt: toDateOrNull(row.updatedAt) ?? new Date(),
  }));
}

function normalizeHourLogs(rows) {
  return rows.map((row) => ({
    id: String(row.id),
    motorId: String(row.motorId),
    hoursAdded: toNumberOrDefault(row.hoursAdded),
    totalAfter: toNumberOrDefault(row.totalAfter),
    userId: row.userId ? String(row.userId) : null,
    rigName: row.rigName ? String(row.rigName) : null,
    wellNumber: row.wellNumber ? String(row.wellNumber) : null,
    notes: row.notes ? String(row.notes) : null,
    createdAt: toDateOrNull(row.createdAt) ?? new Date(),
  }));
}

function normalizeAssemblies(rows) {
  return rows.map((row) => ({
    id: String(row.id),
    motorId: String(row.motorId),
    subComponentId: String(row.subComponentId),
    dateAssembled: toDateOrNull(row.dateAssembled) ?? new Date(),
    dateRemoved: toDateOrNull(row.dateRemoved),
    hoursAtAssembly: toNumberOrDefault(row.hoursAtAssembly),
    hoursAtRemoval: row.hoursAtRemoval == null ? null : toNumberOrDefault(row.hoursAtRemoval),
    hoursAccrued: row.hoursAccrued == null ? null : toNumberOrDefault(row.hoursAccrued),
  }));
}

async function main() {
  console.log('[import:data] Starting data import...');

  const [usersRaw, motorsRaw, partsRaw, hourLogsRaw, assembliesRaw] = await Promise.all([
    readJsonArray('User.json', 'Users'),
    readJsonArray('Motor.json', 'Motors'),
    readJsonArray('SubComponent.json', 'Sub-components'),
    readJsonArray('HourLog.json', 'Hour logs'),
    readJsonArray('Assembly.json', 'Assemblies'),
  ]);

  const users = normalizeUsers(usersRaw);
  const motors = normalizeMotors(motorsRaw);
  const subComponents = normalizeSubComponents(partsRaw);
  const hourLogs = normalizeHourLogs(hourLogsRaw);
  const assemblies = normalizeAssemblies(assembliesRaw);

  try {
    console.log(`[import:data] Importing users (${users.length})...`);
    await prisma.user.createMany(createManyPayload(users));

    console.log(`[import:data] Importing motors (${motors.length})...`);
    await prisma.motor.createMany(createManyPayload(motors));

    console.log(`[import:data] Importing sub-components (${subComponents.length})...`);
    await prisma.subComponent.createMany(createManyPayload(subComponents));

    console.log(`[import:data] Importing hour logs (${hourLogs.length})...`);
    await prisma.hourLog.createMany(createManyPayload(hourLogs));

    console.log(`[import:data] Importing assemblies (${assemblies.length})...`);
    await prisma.assembly.createMany(createManyPayload(assemblies));

    console.log('[import:data] Data import completed.');
  } catch (error) {
    console.error('[import:data] Import failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[import:data] Unexpected failure:', error);
  process.exitCode = 1;
});