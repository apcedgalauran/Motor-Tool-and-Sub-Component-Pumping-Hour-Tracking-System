import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';
import xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config();

const STATUS_MAP = {
  'F': 'ON_JOB',
  'S': 'IN_SERVICE',
  'R': 'RFF',
  'W': 'WOP',
  'U': 'USED',
  '3': 'THIRD_PARTY',
  'L': 'LOST_IN_HOLE',
  'X': 'SCRAP',
  'T': 'TRANSFER',
  'I': 'IDLE',
  'Q': 'QUARANTINE',
  'ON JOB': 'ON_JOB',
  'IN SERVICE': 'IN_SERVICE',
  'RFF': 'RFF',
  'READY FOR FIELD': 'RFF',
  'WOP': 'WOP',
  'WAITING ON PARTS': 'WOP',
  'USED': 'USED',
  '3RD PARTY': 'THIRD_PARTY',
  '3RD PARTY REPAIR': 'THIRD_PARTY',
  'LOST IN HOLE': 'LOST_IN_HOLE',
  'SCRAP': 'SCRAP',
  'TRANSFER': 'TRANSFER',
  'IDLE': 'IDLE',
  'QUARANTINE': 'QUARANTINE',
  'ON_LOCATION': 'ON_JOB',
  'IN_BASE': 'IDLE',
  'FOR_MAINTENANCE': 'IN_SERVICE',
  'ACTIVE': 'IDLE',
  'IN_MAINTENANCE': 'IN_SERVICE',
  'RETIRED': 'SCRAP',
};

const SHEETS = {
  motor: 'Motor',
  stator: 'Stator',
  rotor: 'ROTOR',
  sleeve: 'MOTOR SLEEVE',
};

const HEADER_KEYS = {
  serialNumber: 'serial number',
  sapId: 'sap id',
  assetType: 'asset type',
  size: 'size',
  brandType: 'brand/type',
  connection: 'connection',
  location: 'location',
  status: 'status',
  pumpingHours: 'pumping hours',
  configuration: 'configuration',
};

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '';
const isSqlite = connectionString.startsWith('file:') || connectionString.includes('sqlite');
const isPostgres = connectionString.startsWith('postgres');

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

function parseArgs() {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--file');
  const file = fileIndex >= 0 ? args[fileIndex + 1] : null;
  const commit = args.includes('--commit');
  return { file, commit };
}

function resolveFilePath(fileArg) {
  if (fileArg) return path.resolve(fileArg);
  if (process.env.PROJECT_TRACKER_PATH) return path.resolve(process.env.PROJECT_TRACKER_PATH);

  const localCandidate = path.resolve('PROJECT TRACKER-1.xlsx');
  if (fs.existsSync(localCandidate)) return localCandidate;

  const home = process.env.HOME || '';
  const downloadsCandidate = path.resolve(home, 'Downloads', 'PROJECT TRACKER-1.xlsx');
  if (fs.existsSync(downloadsCandidate)) return downloadsCandidate;

  return null;
}

function normalizeHeader(value) {
  return String(value ?? '').trim().toLowerCase();
}

function buildHeaderIndexMap(headerRow) {
  const map = new Map();
  headerRow.forEach((value, index) => {
    const key = normalizeHeader(value);
    if (key) map.set(key, index);
  });
  return map;
}

function readCell(row, map, key) {
  const index = map.get(key);
  if (index === undefined) return null;
  return row[index] ?? null;
}

function toTrimmedString(value) {
  const str = String(value ?? '').trim();
  return str.length > 0 ? str : null;
}

function toNumberOrDefault(value, defaultValue = 0) {
  if (value == null || String(value).trim() === '') return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function normalizeStatus(raw, warnings, context) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) {
    warnings.push(`[${context}] Missing status -> defaulted to IDLE`);
    return 'IDLE';
  }

  const key = trimmed.toUpperCase();
  const mapped = STATUS_MAP[key];
  if (mapped) return mapped;

  warnings.push(`[${context}] Unknown status "${trimmed}" -> defaulted to IDLE`);
  return 'IDLE';
}

function normalizeHours(raw, warnings, context) {
  if (raw == null || String(raw).trim() === '') return 0;
  const parsed = Number(raw);
  if (Number.isFinite(parsed)) return parsed;
  warnings.push(`[${context}] Invalid pumping hours "${raw}" -> defaulted to 0`);
  return 0;
}

function isBlankRow(row) {
  return row.every((value) => value == null || String(value).trim() === '');
}

function sheetToRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });
}

function buildMotorRecords(rows, warnings) {
  const summary = {
    label: 'Motor',
    totalRows: 0,
    emptyRows: 0,
    missingSerial: 0,
    duplicateSerial: 0,
    existingInDb: 0,
    toInsert: 0,
  };

  if (rows.length === 0) return { records: [], summary };

  const headerMap = buildHeaderIndexMap(rows[0]);
  const seen = new Set();
  const records = [];

  rows.slice(1).forEach((row, index) => {
    summary.totalRows += 1;
    if (isBlankRow(row)) {
      summary.emptyRows += 1;
      return;
    }

    const rowNumber = index + 2;
    const serial = toTrimmedString(readCell(row, headerMap, HEADER_KEYS.serialNumber));
    if (!serial) {
      summary.missingSerial += 1;
      warnings.push(`[Motor row ${rowNumber}] Missing serial number -> skipped`);
      return;
    }

    if (seen.has(serial)) {
      summary.duplicateSerial += 1;
      warnings.push(`[Motor row ${rowNumber}] Duplicate serial number ${serial} -> skipped`);
      return;
    }
    seen.add(serial);

    const assetType = toTrimmedString(readCell(row, headerMap, HEADER_KEYS.assetType));
    const name = assetType ? `${assetType} ${serial}` : serial;

    const status = normalizeStatus(readCell(row, headerMap, HEADER_KEYS.status), warnings, `Motor row ${rowNumber}`);

    records.push({
      name,
      serialNumber: serial,
      sapId: toTrimmedString(readCell(row, headerMap, HEADER_KEYS.sapId)),
      assetType: assetType ?? null,
      size: toTrimmedString(readCell(row, headerMap, HEADER_KEYS.size)),
      brandType: toTrimmedString(readCell(row, headerMap, HEADER_KEYS.brandType)),
      connection: toTrimmedString(readCell(row, headerMap, HEADER_KEYS.connection)),
      location: toTrimmedString(readCell(row, headerMap, HEADER_KEYS.location)),
      status,
    });
  });

  return { records, summary };
}

function buildSubComponentRecords({
  rows,
  sheetName,
  type,
  assetCategory,
  globalSeen,
  warnings,
}) {
  const summary = {
    label: sheetName,
    totalRows: 0,
    emptyRows: 0,
    missingSerial: 0,
    duplicateSerial: 0,
    existingInDb: 0,
    toInsert: 0,
    invalidHours: 0,
  };

  if (rows.length === 0) return { records: [], summary };

  const headerMap = buildHeaderIndexMap(rows[0]);
  const records = [];

  rows.slice(1).forEach((row, index) => {
    summary.totalRows += 1;
    if (isBlankRow(row)) {
      summary.emptyRows += 1;
      return;
    }

    const rowNumber = index + 2;
    const serial = toTrimmedString(readCell(row, headerMap, HEADER_KEYS.serialNumber));
    if (!serial) {
      summary.missingSerial += 1;
      warnings.push(`[${sheetName} row ${rowNumber}] Missing serial number -> skipped`);
      return;
    }

    if (globalSeen.has(serial)) {
      summary.duplicateSerial += 1;
      warnings.push(`[${sheetName} row ${rowNumber}] Duplicate serial number ${serial} -> skipped`);
      return;
    }
    globalSeen.add(serial);

    const status = normalizeStatus(readCell(row, headerMap, HEADER_KEYS.status), warnings, `${sheetName} row ${rowNumber}`);
    const hoursRaw = readCell(row, headerMap, HEADER_KEYS.pumpingHours);
    const hours = normalizeHours(hoursRaw, warnings, `${sheetName} row ${rowNumber}`);
    if (hoursRaw != null && String(hoursRaw).trim() !== '' && !Number.isFinite(Number(hoursRaw))) {
      summary.invalidHours += 1;
    }

    const location = toTrimmedString(readCell(row, headerMap, HEADER_KEYS.location));
    const notes = location ? `Location: ${location}` : null;

    records.push({
      type,
      serialNumber: serial,
      status,
      availabilityStatus: 'AVAILABLE',
      assetCategory,
      cumulativeHours: hours,
      sapId: toTrimmedString(readCell(row, headerMap, HEADER_KEYS.sapId)),
      size: toTrimmedString(readCell(row, headerMap, HEADER_KEYS.size)),
      configuration: toTrimmedString(readCell(row, headerMap, HEADER_KEYS.configuration)),
      brand: toTrimmedString(readCell(row, headerMap, HEADER_KEYS.brandType)),
      notes,
    });
  });

  return { records, summary };
}

function printSummary(title, summary) {
  console.log(`\n${title}`);
  console.log(`  Total rows: ${summary.totalRows}`);
  console.log(`  Empty rows: ${summary.emptyRows}`);
  console.log(`  Missing serial: ${summary.missingSerial}`);
  console.log(`  Duplicate serial (file): ${summary.duplicateSerial}`);
  console.log(`  Existing in DB: ${summary.existingInDb}`);
  console.log(`  To insert: ${summary.toInsert}`);
  if ('invalidHours' in summary) {
    console.log(`  Invalid hours: ${summary.invalidHours}`);
  }
}

async function main() {
  const { file, commit } = parseArgs();
  const filePath = resolveFilePath(file);
  if (!filePath) {
    console.error('Missing Excel file. Provide --file /path/to/PROJECT TRACKER-1.xlsx');
    console.error('Or set PROJECT_TRACKER_PATH in your environment.');
    process.exitCode = 1;
    return;
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Excel file not found: ${filePath}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[import:tracker] File: ${filePath}`);
  console.log(`[import:tracker] Mode: ${commit ? 'COMMIT' : 'DRY-RUN'}`);

  const workbook = xlsx.readFile(filePath, { cellDates: false });
  const warnings = [];

  const motorRows = sheetToRows(workbook, SHEETS.motor);
  const motorResult = buildMotorRecords(motorRows, warnings);

  const subSeen = new Set();
  const subResults = [
    buildSubComponentRecords({
      rows: sheetToRows(workbook, SHEETS.stator),
      sheetName: SHEETS.stator,
      type: 'STATOR',
      assetCategory: 'STATOR',
      globalSeen: subSeen,
      warnings,
    }),
    buildSubComponentRecords({
      rows: sheetToRows(workbook, SHEETS.rotor),
      sheetName: SHEETS.rotor,
      type: 'ROTOR',
      assetCategory: 'ROTOR',
      globalSeen: subSeen,
      warnings,
    }),
    buildSubComponentRecords({
      rows: sheetToRows(workbook, SHEETS.sleeve),
      sheetName: SHEETS.sleeve,
      type: 'SLEEVE',
      assetCategory: 'MOTOR_SLEEVE',
      globalSeen: subSeen,
      warnings,
    }),
  ];

  const existingMotorSerials = new Set(
    (await prisma.motor.findMany({ select: { serialNumber: true } })).map((row) => row.serialNumber),
  );

  const existingSubSerials = new Set(
    (await prisma.subComponent.findMany({ select: { serialNumber: true } })).map((row) => row.serialNumber),
  );

  const motorInsertable = motorResult.records.filter((record) => !existingMotorSerials.has(record.serialNumber));
  motorResult.summary.existingInDb = motorResult.records.length - motorInsertable.length;
  motorResult.summary.toInsert = motorInsertable.length;

  const subInsertable = [];
  subResults.forEach((result) => {
    const insertable = result.records.filter((record) => !existingSubSerials.has(record.serialNumber));
    result.summary.existingInDb = result.records.length - insertable.length;
    result.summary.toInsert = insertable.length;
    subInsertable.push(...insertable);
  });

  printSummary('Motor Sheet', motorResult.summary);
  subResults.forEach((result) => printSummary(`${result.summary.label} Sheet`, result.summary));

  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`);
    warnings.slice(0, 20).forEach((warning) => console.log(`  - ${warning}`));
    if (warnings.length > 20) {
      console.log(`  ... ${warnings.length - 20} more`);
    }
  }

  if (!commit) {
    console.log('\n[import:tracker] Dry-run complete. No data written.');
    return;
  }

  try {
    console.log(`\n[import:tracker] Inserting motors (${motorInsertable.length})...`);
    if (motorInsertable.length > 0) {
      await prisma.motor.createMany({
        data: motorInsertable,
        ...(isPostgres ? { skipDuplicates: true } : {}),
      });
    }

    console.log(`[import:tracker] Inserting sub-components (${subInsertable.length})...`);
    if (subInsertable.length > 0) {
      await prisma.subComponent.createMany({
        data: subInsertable,
        ...(isPostgres ? { skipDuplicates: true } : {}),
      });
    }

    console.log('[import:tracker] Import completed.');
  } catch (error) {
    console.error('[import:tracker] Import failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[import:tracker] Unexpected failure:', error);
  process.exitCode = 1;
});
