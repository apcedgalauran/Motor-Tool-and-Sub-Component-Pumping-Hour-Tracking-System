'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ASSET_STATUS_META, type AssetStatus } from '@/lib/asset-status';
import { isSqliteDb, type ListParams } from '@/lib/utils';

const VALID_STATUSES = new Set(Object.keys(ASSET_STATUS_META));

export async function createMotor(data: {
  name: string;
  serialNumber: string;
  location?: string;
  dateOut?: string;
  dateIn?: string;
  status?: string;
  sapId?: string;
  assetType?: string;
  size?: string;
  brandType?: string;
  connection?: string;
}) {
  const existing = await prisma.motor.findUnique({
    where: { serialNumber: data.serialNumber },
  });

  if (existing) {
    throw new Error('A motor with this serial number already exists.');
  }

  const resolvedStatus = data.status && VALID_STATUSES.has(data.status) ? data.status : 'IDLE';

  const motor = await prisma.motor.create({
    data: {
      name: data.name,
      serialNumber: data.serialNumber,
      location: data.location || null,
      dateOut: data.dateOut ? new Date(data.dateOut) : null,
      dateIn: data.dateIn ? new Date(data.dateIn) : null,
      status: resolvedStatus as any,
      sapId: data.sapId || null,
      assetType: data.assetType || null,
      size: data.size || null,
      brandType: data.brandType || null,
      connection: data.connection || null,
    },
  });

  revalidatePath('/');
  revalidatePath('/motors');
  return motor;
}

export async function updateMotor(
  id: string,
  data: {
    name?: string;
    serialNumber?: string;
    location?: string;
    dateOut?: string | null;
    dateIn?: string | null;
    status?: string;
    sapId?: string | null;
    assetType?: string | null;
    size?: string | null;
    brandType?: string | null;
    connection?: string | null;
  }
) {
  if (data.serialNumber !== undefined) {
    const existing = await prisma.motor.findFirst({
      where: { serialNumber: data.serialNumber, id: { not: id } },
    });

    if (existing) {
      throw new Error('A motor with this serial number already exists.');
    }
  }

  const motor = await prisma.motor.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
      ...(data.location !== undefined && { location: data.location || null }),
      ...(data.dateOut !== undefined && { dateOut: data.dateOut ? new Date(data.dateOut) : null }),
      ...(data.dateIn !== undefined && { dateIn: data.dateIn ? new Date(data.dateIn) : null }),
      ...(data.status !== undefined && { status: data.status as any }),
      ...(data.sapId !== undefined && { sapId: data.sapId || null }),
      ...(data.assetType !== undefined && { assetType: data.assetType || null }),
      ...(data.size !== undefined && { size: data.size || null }),
      ...(data.brandType !== undefined && { brandType: data.brandType || null }),
      ...(data.connection !== undefined && { connection: data.connection || null }),
    },
  });

  revalidatePath('/');
  revalidatePath('/motors');
  revalidatePath(`/motors/${id}`);
  return motor;
}

export async function deleteMotor(id: string) {
  // Check for active assemblies first
  const activeAssemblies = await prisma.assembly.findFirst({
    where: { motorId: id, dateRemoved: null },
  });

  if (activeAssemblies) {
    throw new Error('Cannot delete motor with active assemblies. Disassemble all sub-components first.');
  }

  await prisma.motor.delete({ where: { id } });

  revalidatePath('/');
  revalidatePath('/motors');
}

export async function getMotors() {
  return prisma.motor.findMany({
    include: {
      assemblies: {
        where: { dateRemoved: null },
        include: { subComponent: true },
      },
      _count: {
        select: {
          assemblies: { where: { dateRemoved: null } },
          hourLogs: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getMotor(id: string) {
  try {
    return await prisma.motor.findUnique({
      where: { id },
      include: {
        assemblies: {
          include: { subComponent: true },
          orderBy: { dateAssembled: 'desc' },
        },
        hourLogs: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true } } },
        },
        editLogs: {
          orderBy: { editedAt: 'desc' },
          include: { user: { select: { name: true } } },
        },
        files: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploader: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientValidationError
      && error.message.includes('Unknown field `files`')
      && error.message.includes('model `Motor`')
    ) {
      const legacyMotor = await prisma.motor.findUnique({
        where: { id },
        include: {
          assemblies: {
            include: { subComponent: true },
            orderBy: { dateAssembled: 'desc' },
          },
          hourLogs: {
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true } } },
          },
          editLogs: {
            orderBy: { editedAt: 'desc' },
            include: { user: { select: { name: true } } },
          },
        },
      });

      if (!legacyMotor) return null;

      return {
        ...legacyMotor,
        files: [],
      };
    }

    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Paginated / filtered / sorted motor list
// ─────────────────────────────────────────────────────────────────────────────

const MOTOR_SORT_FIELDS = [
  'serialNumber', 'name', 'status', 'pumpingHours', 'updatedAt', 'location',
] as const;
type MotorSortField = (typeof MOTOR_SORT_FIELDS)[number];

export interface MotorListItem {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
  location: string | null;
  sapId: string | null;
  assetType: string | null;
  size: string | null;
  brandType: string | null;
  connection: string | null;
  pumpingHours: number;
  updatedAt: Date;
  _count: { assemblies: number };
}

export interface MotorListResult {
  items: MotorListItem[];
  total: number;
}

export async function listMotors(params: Partial<ListParams>): Promise<MotorListResult> {
  const sqlite = isSqliteDb();
  const {
    q = '',
    statuses = [],
    page = 1,
    pageSize = 20,
    sort = 'updatedAt',
    dir = 'desc',
    location = '',
    size = '',
    brand = '',
  } = params;

  const skip = (page - 1) * pageSize;

  // Build where clause
  const where: Prisma.MotorWhereInput = {};

  if (q) {
    const contains = { contains: q, ...(sqlite ? {} : { mode: 'insensitive' as const }) };
    where.OR = [
      { serialNumber: contains },
      { name: contains },
      { sapId: contains },
    ];
  }
  if (statuses.length > 0) {
    where.status = { in: statuses as AssetStatus[] };
  }
  if (location) {
    where.location = { contains: location, ...(sqlite ? {} : { mode: 'insensitive' as const }) };
  }
  if (size) {
    where.size = { contains: size, ...(sqlite ? {} : { mode: 'insensitive' as const }) };
  }
  if (brand) {
    where.brandType = { contains: brand, ...(sqlite ? {} : { mode: 'insensitive' as const }) };
  }

  // Build orderBy
  const validSort = (MOTOR_SORT_FIELDS as readonly string[]).includes(sort)
    ? (sort as MotorSortField)
    : 'updatedAt';
  const orderBy: Prisma.MotorOrderByWithRelationInput = { [validSort]: dir };

  const [items, total] = await Promise.all([
    prisma.motor.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      select: {
        id: true,
        name: true,
        serialNumber: true,
        status: true,
        location: true,
        sapId: true,
        assetType: true,
        size: true,
        brandType: true,
        connection: true,
        pumpingHours: true,
        updatedAt: true,
        _count: {
          select: { assemblies: { where: { dateRemoved: null } } },
        },
      },
    }),
    prisma.motor.count({ where }),
  ]);

  return { items: items as MotorListItem[], total };
}
