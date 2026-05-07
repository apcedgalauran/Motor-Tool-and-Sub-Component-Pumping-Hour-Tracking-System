'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { updateSubComponentRecord } from '@/lib/subcomponent';
import { revalidatePath } from 'next/cache';
import { TERMINAL_STATUSES, type AssetStatus } from '@/lib/asset-status';
import { isSqliteDb, type ListParams } from '@/lib/utils';

/** Maps known component type keys to their assetCategory. */
const TYPE_TO_CATEGORY: Record<string, string> = {
  STATOR: 'STATOR',
  ROTOR: 'ROTOR',
  SLEEVE: 'MOTOR_SLEEVE',
};

function resolveAssetCategory(type: string, explicitCategory?: string): string {
  if (explicitCategory && ['STATOR', 'ROTOR', 'MOTOR_SLEEVE', 'OTHER'].includes(explicitCategory)) {
    return explicitCategory;
  }
  return TYPE_TO_CATEGORY[type] ?? 'OTHER';
}

export async function createSubComponent(data: {
  type: string;
  serialNumber: string;
  notes?: string;
  assetCategory?: string;
  sapId?: string;
  size?: string;
  configuration?: string;
  brand?: string;
}) {
  const normalizedType = data.type.trim();
  if (!normalizedType) {
    throw new Error('Please enter a component type.');
  }

  const existing = await prisma.subComponent.findUnique({
    where: { serialNumber: data.serialNumber },
  });

  if (existing) {
    throw new Error('A sub-component with this serial number already exists.');
  }

  const assetCategory = resolveAssetCategory(normalizedType, data.assetCategory);

  const subComponent = await prisma.subComponent.create({
    data: {
      type: normalizedType,
      serialNumber: data.serialNumber,
      status: 'IDLE',
      notes: data.notes || null,
      assetCategory: assetCategory as any,
      sapId: data.sapId || null,
      size: data.size || null,
      configuration: data.configuration || null,
      brand: data.brand || null,
    },
  });

  revalidatePath('/sub-components');
  revalidatePath('/stators');
  revalidatePath('/rotors');
  revalidatePath('/motor-sleeves');
  return { ...subComponent, assetCategory };
}

export async function updateSubComponent(
  id: string,
  data: {
    type?: string;
    serialNumber?: string;
    notes?: string;
    status?: string;
  }
) {
  const subComponent = await updateSubComponentRecord(id, data);

  revalidatePath('/sub-components');
  revalidatePath(`/sub-components/${id}`);
  return subComponent;
}

export async function deleteSubComponent(id: string) {
  const activeAssembly = await prisma.assembly.findFirst({
    where: { subComponentId: id, dateRemoved: null },
  });

  if (activeAssembly) {
    throw new Error('Cannot delete sub-component while it is assembled in a motor.');
  }

  await prisma.subComponent.delete({ where: { id } });

  revalidatePath('/sub-components');
}

export async function getSubComponents() {
  return prisma.subComponent.findMany({
    include: {
      assemblies: {
        where: { dateRemoved: null },
        include: { motor: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getSubComponent(id: string) {
  return prisma.subComponent.findUnique({
    where: { id },
    include: {
      assemblies: {
        include: { motor: true },
        orderBy: { dateAssembled: 'desc' },
      },
      subComponentHourLogs: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true } },
          motor: { select: { id: true, name: true, serialNumber: true } },
        },
      },
    },
  });
}

export async function getAvailableSubComponents() {
  return prisma.subComponent.findMany({
    where: {
      // Must not be currently assembled in any active motor
      assemblies: {
        none: { dateRemoved: null },
      },
      // Exclude terminal statuses (PRD §10.8, FR-04): LOST_IN_HOLE, SCRAP, QUARANTINE
      status: {
        notIn: TERMINAL_STATUSES,
      },
    },
    orderBy: [{ type: 'asc' }, { serialNumber: 'asc' }],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Paginated / filtered / sorted sub-component list
// ─────────────────────────────────────────────────────────────────────────────

const SC_SORT_FIELDS = [
  'serialNumber', 'type', 'status', 'cumulativeHours', 'updatedAt',
] as const;
type ScSortField = (typeof SC_SORT_FIELDS)[number];

export interface SubComponentListItem {
  id: string;
  type: string;
  serialNumber: string;
  sapId: string | null;
  size: string | null;
  brand: string | null;
  configuration: string | null;
  cumulativeHours: number;
  status: string;
  availabilityStatus: string;
  assetCategory: string;
  updatedAt: Date;
  assemblies: Array<{
    motor: { id: string; name: string; location: string | null } | null;
  }>;
}

export interface SubComponentListResult {
  items: SubComponentListItem[];
  total: number;
}

export async function listSubComponents(
  params: Partial<ListParams> & { assetCategory?: string },
): Promise<SubComponentListResult> {
  const sqlite = isSqliteDb();
  const {
    q = '',
    statuses = [],
    page = 1,
    pageSize = 20,
    sort = 'serialNumber',
    dir = 'asc',
    size = '',
    brand = '',
    configuration = '',
    hoursMin = null,
    hoursMax = null,
    installed = '',
    motorQ = '',
    assetCategory,
  } = params;

  const skip = (page - 1) * pageSize;

  const where: Prisma.SubComponentWhereInput = {};

  // Category filter (for dedicated stator/rotor/sleeve pages)
  if (assetCategory) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where.assetCategory = assetCategory as any;
  }

  // Text search across serial number and type
  if (q) {
    const contains = { contains: q, ...(sqlite ? {} : { mode: 'insensitive' as const }) };
    where.OR = [{ serialNumber: contains }, { type: contains }, { sapId: contains }];
  }

  // Multi-status filter
  if (statuses.length > 0) {
    where.status = { in: statuses as AssetStatus[] };
  }

  // Extra field filters
  if (size) {
    where.size = { contains: size, ...(sqlite ? {} : { mode: 'insensitive' as const }) };
  }
  if (brand) {
    where.brand = { contains: brand, ...(sqlite ? {} : { mode: 'insensitive' as const }) };
  }
  if (configuration) {
    where.configuration = {
      contains: configuration,
      ...(sqlite ? {} : { mode: 'insensitive' as const }),
    };
  }

  // Hours range
  if (hoursMin !== null || hoursMax !== null) {
    where.cumulativeHours = {
      ...(hoursMin !== null ? { gte: hoursMin } : {}),
      ...(hoursMax !== null ? { lte: hoursMax } : {}),
    };
  }

  // Installed / available filter
  if (installed === 'yes') {
    where.assemblies = { some: { dateRemoved: null } };
  } else if (installed === 'no') {
    where.assemblies = { none: { dateRemoved: null } };
  }

  // Motor search (free-text on motor name or serial number)
  if (motorQ) {
    const mContains = {
      contains: motorQ,
      ...(sqlite ? {} : { mode: 'insensitive' as const }),
    };
    where.assemblies = {
      ...((where.assemblies as object) ?? {}),
      some: {
        dateRemoved: null,
        motor: { OR: [{ name: mContains }, { serialNumber: mContains }] },
      },
    };
  }

  // Sort
  const validSort = (SC_SORT_FIELDS as readonly string[]).includes(sort)
    ? (sort as ScSortField)
    : 'serialNumber';
  const orderBy: Prisma.SubComponentOrderByWithRelationInput = { [validSort]: dir };

  const [items, total] = await Promise.all([
    prisma.subComponent.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      select: {
        id: true,
        type: true,
        serialNumber: true,
        sapId: true,
        size: true,
        brand: true,
        configuration: true,
        cumulativeHours: true,
        status: true,
        availabilityStatus: true,
        assetCategory: true,
        updatedAt: true,
        assemblies: {
          where: { dateRemoved: null },
          take: 1,
          select: {
            motor: { select: { id: true, name: true, location: true } },
          },
        },
      },
    }),
    prisma.subComponent.count({ where }),
  ]);

  return { items: items as SubComponentListItem[], total };
}
