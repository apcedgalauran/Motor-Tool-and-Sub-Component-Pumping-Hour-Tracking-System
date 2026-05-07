import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '';
const isSqlite = connectionString.startsWith('file:') || connectionString.includes('sqlite');
const isPostgres = connectionString.startsWith('postgres');
const log = ['warn', 'error'];

function createPrismaClient() {
  if (isSqlite) {
    const adapter = new PrismaBetterSqlite3({ url: connectionString });
    return new PrismaClient({ adapter, log });
  }

  if (isPostgres) {
    const adapter = new PrismaPg({ connectionString });
    return new PrismaClient({ adapter, log });
  }

  return new PrismaClient({ log });
}

const prisma = createPrismaClient();

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function hoursAgo(hours) {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}

const statusCycle = [
  'IDLE',
  'ON_JOB',
  'IN_SERVICE',
  'RFF',
  'WOP',
  'USED',
  'TRANSFER',
  'QUARANTINE',
];

function formatIndex(value, width) {
  return String(value).padStart(width, '0');
}

function getAssetCategoryByType(type) {
  if (type === 'STATOR') return 'STATOR';
  if (type === 'ROTOR') return 'ROTOR';
  if (type === 'SLEEVE') return 'MOTOR_SLEEVE';
  return 'OTHER';
}

function getSizeByType(type) {
  if (type === 'STATOR' || type === 'ROTOR') return '7.00';
  if (type === 'SLEEVE') return '6.75';
  return null;
}

function getBrandByType(type) {
  if (type === 'STATOR' || type === 'ROTOR') return 'Phoenix';
  if (type === 'SLEEVE') return 'Riverside';
  return null;
}

function getConfigurationByType(type) {
  if (type === 'STATOR') return 'High Temp';
  if (type === 'ROTOR') return 'Standard';
  if (type === 'SLEEVE') return 'HP';
  return null;
}

function buildMotorSeed(index) {
  const serialSuffix = formatIndex(index, 3);
  const status = statusCycle[index % statusCycle.length];
  const pumpingHours = Number((index * 3.7 + (index % 4) * 1.5).toFixed(1));
  const location = index % 3 === 0 ? 'Yard' : 'Abu Dhabi';
  const dateOut = status === 'ON_JOB' || status === 'IN_SERVICE' ? daysAgo(8 + index) : null;
  const dateIn = status === 'TRANSFER' ? daysAgo(4 + index) : null;

  return {
    name: `Seed Motor ${serialSuffix}`,
    serialNumber: `DEV-SEED-${serialSuffix}`,
    location,
    status,
    pumpingHours,
    dateOut,
    dateIn,
    sapId: `SAP-M-${2000 + index}`,
    assetType: 'Motor',
    size: index % 2 === 0 ? '9 5/8"' : '7"',
    brandType: index % 2 === 0 ? 'RADIUS' : 'DRU2 850',
    connection: index % 2 === 0 ? 'STD' : 'PAC',
  };
}

function buildSubComponentSeed(type, typeIndex, index) {
  const serialSuffix = formatIndex(index, 2);
  const status = statusCycle[(index + typeIndex) % statusCycle.length];
  const cumulativeHours = Number((index * 2.2 + typeIndex).toFixed(1));

  return {
    type,
    serialNumber: `SC-${type}-AUTO-${serialSuffix}`,
    assetCategory: getAssetCategoryByType(type),
    status,
    availabilityStatus: 'AVAILABLE',
    cumulativeHours,
    sapId: `SAP-SC-${formatIndex(typeIndex + 1, 2)}-${serialSuffix}`,
    size: getSizeByType(type),
    brand: getBrandByType(type),
    configuration: getConfigurationByType(type),
  };
}

const userSeeds = [
  { name: 'Rei', email: 'rei@motortracker.app', password: 'password' },
  { name: 'Norman', email: 'norman@motortracker.app', password: 'password' },
  { name: 'Seed Operator', email: 'seed@motortracker.app', password: 'password' },
];

const baseMotorSeeds = [
  {
    name: 'Northline A',
    serialNumber: 'DEV-7008',
    location: 'Abu Dhabi',
    status: 'IDLE',
    pumpingHours: 0,
  },
  {
    name: 'Closser',
    serialNumber: 'DEV-12314158154AA',
    location: 'Abu Dhabi',
    status: 'ON_JOB',
    pumpingHours: 18,
    dateOut: daysAgo(22),
    sapId: 'SAP-M-2001',
    assetType: 'Motor',
    size: '9 5/8"',
    brandType: 'RADIUS',
    connection: 'STD',
  },
  {
    name: 'Motor 3FA',
    serialNumber: 'DEV-12314158154FA',
    location: 'Abu Dhabi',
    status: 'IN_SERVICE',
    pumpingHours: 42.5,
    dateOut: daysAgo(40),
    sapId: 'SAP-M-3001',
    assetType: 'Motor',
    size: '7"',
    brandType: 'DRU2 850',
    connection: 'PAC',
  },
  {
    name: 'Motor 1',
    serialNumber: 'DEV-123456789',
    location: 'Abu Dhabi',
    status: 'RFF',
    pumpingHours: 12,
  },
  {
    name: 'Motor 2',
    serialNumber: 'DEV-12412412414',
    location: 'Abu Dhabi',
    status: 'WOP',
    pumpingHours: 7.5,
  },
  {
    name: 'DeepRun 90',
    serialNumber: 'DEV-9901',
    location: 'Yard',
    status: 'TRANSFER',
    pumpingHours: 88,
    dateIn: daysAgo(4),
  },
];

const extraMotorCount = 20;
const motorSeeds = baseMotorSeeds.concat(
  Array.from({ length: extraMotorCount }, (_, index) => buildMotorSeed(index + 1)),
);

const subComponentSeedBase = [
  {
    type: 'STATOR',
    serialNumber: 'SC-STAT-70084',
    assetCategory: 'STATOR',
    status: 'ON_JOB',
    availabilityStatus: 'AVAILABLE',
    cumulativeHours: 18,
    sapId: 'SAP-1001',
    size: '7.00',
    brand: 'Phoenix',
    configuration: 'High Temp',
  },
  {
    type: 'ROTOR',
    serialNumber: 'SC-ROT-88121',
    assetCategory: 'ROTOR',
    status: 'ON_JOB',
    availabilityStatus: 'AVAILABLE',
    cumulativeHours: 18,
    sapId: 'SAP-2001',
    size: '7.00',
    brand: 'Phoenix',
    configuration: 'Standard',
  },
  {
    type: 'SLEEVE',
    serialNumber: 'SC-SLEEVE-55221',
    assetCategory: 'MOTOR_SLEEVE',
    status: 'IN_SERVICE',
    availabilityStatus: 'AVAILABLE',
    cumulativeHours: 7.5,
    sapId: 'SAP-3001',
    size: '6.75',
    brand: 'Riverside',
    configuration: 'HP',
  },
  {
    type: 'ADJUSTING_RING',
    serialNumber: 'SC-ADJUST-45112',
    assetCategory: 'OTHER',
    status: 'IDLE',
    availabilityStatus: 'AVAILABLE',
    cumulativeHours: 2,
  },
  {
    type: 'OFFSET_HOUSING',
    serialNumber: 'SC-OFFSET-22911',
    assetCategory: 'OTHER',
    status: 'IDLE',
    availabilityStatus: 'AVAILABLE',
    cumulativeHours: 7.5,
  },
  {
    type: 'SHAFT_COUPLING',
    serialNumber: 'SC-COUP-10555',
    assetCategory: 'OTHER',
    status: 'IDLE',
    availabilityStatus: 'AVAILABLE',
    cumulativeHours: 1,
  },
  {
    type: 'SPLINE_MANDREL',
    serialNumber: 'SC-SPLINE-8899',
    assetCategory: 'OTHER',
    status: 'IDLE',
    availabilityStatus: 'AVAILABLE',
    cumulativeHours: 3,
  },
  {
    type: 'STATOR_ADAPTER',
    serialNumber: 'SC-ADAPTER-1022',
    assetCategory: 'OTHER',
    status: 'RFF',
    availabilityStatus: 'AVAILABLE',
    cumulativeHours: 9.5,
  },
  {
    type: 'ROTOR_COUPLING',
    serialNumber: 'SC-ROTOR-COUP-3001',
    assetCategory: 'OTHER',
    status: 'IN_SERVICE',
    availabilityStatus: 'AVAILABLE',
    cumulativeHours: 4.5,
  },
  {
    type: 'TRANS_SHAFT',
    serialNumber: 'SC-TRANS-4400',
    assetCategory: 'OTHER',
    status: 'IDLE',
    availabilityStatus: 'AVAILABLE',
    cumulativeHours: 0,
  },
  {
    type: 'FLOAT_SUB',
    serialNumber: 'SC-FLOAT-4401',
    assetCategory: 'OTHER',
    status: 'QUARANTINE',
    availabilityStatus: 'AVAILABLE',
    cumulativeHours: 0,
  },
  {
    type: 'LIFT_SUB',
    serialNumber: 'SC-LIFT-4402',
    assetCategory: 'OTHER',
    status: 'SCRAP',
    availabilityStatus: 'AVAILABLE',
    cumulativeHours: 0,
  },
];

const subComponentTypes = [
  'STATOR',
  'ROTOR',
  'SLEEVE',
  'ADJUSTING_RING',
  'OFFSET_HOUSING',
  'SHAFT_COUPLING',
  'SPLINE_MANDREL',
  'STATOR_ADAPTER',
  'ROTOR_COUPLING',
  'TRANS_SHAFT',
  'FLOAT_SUB',
  'LIFT_SUB',
];

const targetPerType = 5;
const subComponentSeeds = subComponentSeedBase.concat(
  subComponentTypes.flatMap((type, typeIndex) => {
    const currentCount = subComponentSeedBase.filter((seed) => seed.type === type).length;
    const needed = Math.max(0, targetPerType - currentCount);
    return Array.from({ length: needed }, (_, index) =>
      buildSubComponentSeed(type, typeIndex, index + 1),
    );
  }),
);

const assemblySeeds = [
  {
    motorSerial: 'DEV-12314158154AA',
    subComponentSerial: 'SC-STAT-70084',
    dateAssembled: daysAgo(15),
    hoursAtAssembly: 10,
  },
  {
    motorSerial: 'DEV-12314158154AA',
    subComponentSerial: 'SC-ROT-88121',
    dateAssembled: daysAgo(15),
    hoursAtAssembly: 10,
  },
  {
    motorSerial: 'DEV-12412412414',
    subComponentSerial: 'SC-SLEEVE-55221',
    dateAssembled: daysAgo(12),
    hoursAtAssembly: 6,
  },
  {
    motorSerial: 'DEV-12412412414',
    subComponentSerial: 'SC-ADJUST-45112',
    dateAssembled: daysAgo(9),
    hoursAtAssembly: 2,
  },
  {
    motorSerial: 'DEV-123456789',
    subComponentSerial: 'SC-OFFSET-22911',
    dateAssembled: daysAgo(6),
    hoursAtAssembly: 7,
  },
  {
    motorSerial: 'DEV-123456789',
    subComponentSerial: 'SC-COUP-10555',
    dateAssembled: daysAgo(6),
    hoursAtAssembly: 1,
  },
  {
    motorSerial: 'DEV-7008',
    subComponentSerial: 'SC-SPLINE-8899',
    dateAssembled: daysAgo(18),
    dateRemoved: daysAgo(4),
    hoursAtAssembly: 0,
    hoursAtRemoval: 3,
    hoursAccrued: 3,
  },
];

const motorLogSeeds = [
  {
    motorSerial: 'DEV-12314158154AA',
    entries: [
      {
        hoursAdded: 4.5,
        rigName: 'Rig 22',
        wellNumber: 'A-12',
        notes: 'Startup run',
        createdAt: daysAgo(10),
      },
      {
        hoursAdded: 13.5,
        rigName: 'Rig 22',
        wellNumber: 'A-12',
        notes: 'Continued run',
        createdAt: daysAgo(3),
      },
    ],
  },
  {
    motorSerial: 'DEV-12412412414',
    entries: [
      {
        hoursAdded: 7.5,
        rigName: 'Rig 11',
        wellNumber: 'B-07',
        notes: 'Short test',
        createdAt: daysAgo(5),
      },
    ],
  },
];

const subComponentLogSeeds = [
  {
    subComponentSerial: 'SC-STAT-70084',
    motorSerial: 'DEV-12314158154AA',
    entries: [
      {
        hoursAdded: 8,
        rigName: 'Rig 22',
        wellNumber: 'A-12',
        notes: 'Initial install run',
        createdAt: daysAgo(12),
      },
      {
        hoursAdded: 10,
        rigName: 'Rig 22',
        wellNumber: 'A-12',
        notes: 'Follow-up run',
        createdAt: daysAgo(2),
      },
    ],
  },
  {
    subComponentSerial: 'SC-ADJUST-45112',
    motorSerial: 'DEV-12412412414',
    entries: [
      {
        hoursAdded: 2,
        rigName: 'Rig 11',
        wellNumber: 'B-07',
        notes: 'Assembly test',
        createdAt: hoursAgo(40),
      },
    ],
  },
];

async function seedUsers() {
  const userIds = {};
  for (const user of userSeeds) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, passwordHash },
      create: { name: user.name, email: user.email, passwordHash },
    });
    userIds[user.email] = record.id;
  }
  return userIds;
}

async function seedMotors() {
  const motorIds = {};
  for (const motor of motorSeeds) {
    const record = await prisma.motor.upsert({
      where: { serialNumber: motor.serialNumber },
      update: {
        name: motor.name,
        location: motor.location ?? null,
        status: motor.status,
        pumpingHours: motor.pumpingHours,
        dateOut: motor.dateOut ?? null,
        dateIn: motor.dateIn ?? null,
        sapId: motor.sapId ?? null,
        assetType: motor.assetType ?? null,
        size: motor.size ?? null,
        brandType: motor.brandType ?? null,
        connection: motor.connection ?? null,
      },
      create: {
        name: motor.name,
        serialNumber: motor.serialNumber,
        location: motor.location ?? null,
        status: motor.status,
        pumpingHours: motor.pumpingHours,
        dateOut: motor.dateOut ?? null,
        dateIn: motor.dateIn ?? null,
        sapId: motor.sapId ?? null,
        assetType: motor.assetType ?? null,
        size: motor.size ?? null,
        brandType: motor.brandType ?? null,
        connection: motor.connection ?? null,
      },
    });
    motorIds[motor.serialNumber] = record.id;
  }
  return motorIds;
}

async function seedSubComponents() {
  const subComponentIds = {};
  for (const sc of subComponentSeeds) {
    const record = await prisma.subComponent.upsert({
      where: { serialNumber: sc.serialNumber },
      update: {
        type: sc.type,
        status: sc.status,
        availabilityStatus: sc.availabilityStatus,
        assetCategory: sc.assetCategory,
        cumulativeHours: sc.cumulativeHours,
        sapId: sc.sapId ?? null,
        size: sc.size ?? null,
        brand: sc.brand ?? null,
        configuration: sc.configuration ?? null,
        notes: sc.notes ?? null,
      },
      create: {
        type: sc.type,
        serialNumber: sc.serialNumber,
        status: sc.status,
        availabilityStatus: sc.availabilityStatus,
        assetCategory: sc.assetCategory,
        cumulativeHours: sc.cumulativeHours,
        sapId: sc.sapId ?? null,
        size: sc.size ?? null,
        brand: sc.brand ?? null,
        configuration: sc.configuration ?? null,
        notes: sc.notes ?? null,
      },
    });
    subComponentIds[sc.serialNumber] = record.id;
  }
  return subComponentIds;
}

async function seedAssemblies(motorIds, subComponentIds) {
  const motorIdList = Object.values(motorIds);
  const subComponentIdList = Object.values(subComponentIds);

  await prisma.assembly.deleteMany({
    where: {
      OR: [
        { motorId: { in: motorIdList } },
        { subComponentId: { in: subComponentIdList } },
      ],
    },
  });

  const assemblyData = assemblySeeds.map((seed) => ({
    motorId: motorIds[seed.motorSerial],
    subComponentId: subComponentIds[seed.subComponentSerial],
    dateAssembled: seed.dateAssembled ?? new Date(),
    dateRemoved: seed.dateRemoved ?? null,
    hoursAtAssembly: seed.hoursAtAssembly,
    hoursAtRemoval: seed.hoursAtRemoval ?? null,
    hoursAccrued: seed.hoursAccrued ?? null,
  }));

  if (assemblyData.length > 0) {
    await prisma.assembly.createMany({ data: assemblyData });
  }

  const installedSerials = new Set(
    assemblySeeds
      .filter((seed) => !seed.dateRemoved)
      .map((seed) => seed.subComponentSerial),
  );

  const installedIds = Object.entries(subComponentIds)
    .filter(([serial]) => installedSerials.has(serial))
    .map(([, id]) => id);

  const availableIds = Object.entries(subComponentIds)
    .filter(([serial]) => !installedSerials.has(serial))
    .map(([, id]) => id);

  if (installedIds.length > 0) {
    await prisma.subComponent.updateMany({
      where: { id: { in: installedIds } },
      data: { availabilityStatus: 'INSTALLED' },
    });
  }

  if (availableIds.length > 0) {
    await prisma.subComponent.updateMany({
      where: { id: { in: availableIds } },
      data: { availabilityStatus: 'AVAILABLE' },
    });
  }
}

async function seedMotorLogs(motorIds, userIds) {
  const motorIdList = Object.values(motorIds);
  await prisma.hourLog.deleteMany({ where: { motorId: { in: motorIdList } } });

  const logData = [];

  for (const seed of motorLogSeeds) {
    const motorId = motorIds[seed.motorSerial];
    if (!motorId) continue;

    let totalAfter = 0;
    for (const entry of seed.entries) {
      totalAfter += entry.hoursAdded;
      logData.push({
        motorId,
        hoursAdded: entry.hoursAdded,
        totalAfter,
        userId: userIds['seed@motortracker.app'] ?? null,
        rigName: entry.rigName ?? null,
        wellNumber: entry.wellNumber ?? null,
        notes: entry.notes ?? null,
        createdAt: entry.createdAt ?? new Date(),
      });
    }

    await prisma.motor.update({
      where: { id: motorId },
      data: { pumpingHours: totalAfter },
    });
  }

  if (logData.length > 0) {
    await prisma.hourLog.createMany({ data: logData });
  }
}

async function seedSubComponentLogs(subComponentIds, motorIds, userIds) {
  const subComponentIdList = Object.values(subComponentIds);
  await prisma.subComponentHourLog.deleteMany({
    where: { subComponentId: { in: subComponentIdList } },
  });

  const logData = [];
  const totalsBySubComponent = new Map();

  for (const seed of subComponentLogSeeds) {
    const subComponentId = subComponentIds[seed.subComponentSerial];
    if (!subComponentId) continue;

    const motorId = seed.motorSerial ? motorIds[seed.motorSerial] : null;
    let totalAfter = 0;

    for (const entry of seed.entries) {
      totalAfter += entry.hoursAdded;
      logData.push({
        subComponentId,
        motorId: motorId ?? null,
        userId: userIds['seed@motortracker.app'],
        hoursAdded: entry.hoursAdded,
        totalAfter,
        rigName: entry.rigName,
        wellNumber: entry.wellNumber,
        notes: entry.notes ?? null,
        createdAt: entry.createdAt ?? new Date(),
      });
    }

    totalsBySubComponent.set(subComponentId, totalAfter);
  }

  if (logData.length > 0) {
    await prisma.subComponentHourLog.createMany({ data: logData });
  }

  for (const [subComponentId, totalAfter] of totalsBySubComponent.entries()) {
    await prisma.subComponent.update({
      where: { id: subComponentId },
      data: { cumulativeHours: totalAfter },
    });
  }
}

async function main() {
  console.log('[seed:test-data] Seeding local test data...');

  const userIds = await seedUsers();
  const motorIds = await seedMotors();
  const subComponentIds = await seedSubComponents();

  await seedAssemblies(motorIds, subComponentIds);
  await seedMotorLogs(motorIds, userIds);
  await seedSubComponentLogs(subComponentIds, motorIds, userIds);

  console.log('[seed:test-data] Done.');
}

main()
  .catch((error) => {
    console.error('[seed:test-data] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
