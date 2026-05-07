export const runtime = 'nodejs';

import { auth } from '@/auth';
import { type AssetStatus, getStatusMeta, ASSET_STATUS_META } from '@/lib/asset-status';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const VALID_ASSET_STATUSES = new Set<string>(Object.keys(ASSET_STATUS_META));

function parsePositiveInt(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Safely derive statusCode + statusLabel for any status string. */
function resolveStatusMeta(status: string): { statusCode: string; statusLabel: string } {
  if (VALID_ASSET_STATUSES.has(status)) {
    const meta = getStatusMeta(status as AssetStatus);
    return { statusCode: meta.code, statusLabel: meta.label };
  }
  return { statusCode: '', statusLabel: status };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const q = searchParams.get('q') ?? '';
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const pageSize = Math.min(
      parsePositiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    );
    const skip = (page - 1) * pageSize;

    const empty = { results: [], total: 0, page, pageSize };

    // Return empty results immediately when query is blank.
    if (!q.trim()) {
      return NextResponse.json({
        query: q,
        motors: empty,
        stators: empty,
        rotors: empty,
        motorSleeves: empty,
      });
    }

    const isSqlite =
      process.env.DATABASE_URL?.startsWith('file:') ||
      process.env.DATABASE_URL?.includes('sqlite');

    const textFilter = (field: string) => ({
      [field]: {
        contains: q,
        ...(isSqlite ? {} : { mode: 'insensitive' as const }),
      },
    });

    const serialFilter = textFilter('serialNumber');

    const motorFilter = {
      OR: [
        textFilter('serialNumber'),
        textFilter('name'),
        textFilter('sapId'),
        textFilter('assetType'),
        textFilter('size'),
        textFilter('brandType'),
        textFilter('connection'),
      ],
    };

    const subComponentSelect = {
      id: true,
      serialNumber: true,
      sapId: true,
      size: true,
      brand: true,
      configuration: true,
      cumulativeHours: true,
      availabilityStatus: true,
      status: true,
      assemblies: {
        where: { dateRemoved: null },
        take: 1,
        select: {
          motor: {
            select: {
              id: true,
              name: true,
              serialNumber: true,
            },
          },
        },
      },
    } as const;

    const [
      motors,
      motorTotal,
      stators,
      statorTotal,
      rotors,
      rotorTotal,
      motorSleeves,
      motorSleeveTotal,
    ] = await Promise.all([
      // Motors
      prisma.motor.findMany({
        where: motorFilter,
        skip,
        take: pageSize,
        orderBy: { serialNumber: 'asc' },
        select: {
          id: true,
          name: true,
          serialNumber: true,
          status: true,
          location: true,
          pumpingHours: true,
          sapId: true,
          assetType: true,
          size: true,
          brandType: true,
          connection: true,
        },
      }),
      prisma.motor.count({ where: motorFilter }),

      // Stators
      prisma.subComponent.findMany({
        where: { ...serialFilter, assetCategory: 'STATOR' },
        skip,
        take: pageSize,
        orderBy: { serialNumber: 'asc' },
        select: subComponentSelect,
      }),
      prisma.subComponent.count({ where: { ...serialFilter, assetCategory: 'STATOR' } }),

      // Rotors
      prisma.subComponent.findMany({
        where: { ...serialFilter, assetCategory: 'ROTOR' },
        skip,
        take: pageSize,
        orderBy: { serialNumber: 'asc' },
        select: subComponentSelect,
      }),
      prisma.subComponent.count({ where: { ...serialFilter, assetCategory: 'ROTOR' } }),

      // Motor Sleeves
      prisma.subComponent.findMany({
        where: { ...serialFilter, assetCategory: 'MOTOR_SLEEVE' },
        skip,
        take: pageSize,
        orderBy: { serialNumber: 'asc' },
        select: subComponentSelect,
      }),
      prisma.subComponent.count({ where: { ...serialFilter, assetCategory: 'MOTOR_SLEEVE' } }),
    ]);

    const motorResults = motors.map((m) => {
      const { statusCode, statusLabel } = resolveStatusMeta(m.status ?? '');
      return {
        id: m.id,
        name: m.name,
        serialNumber: m.serialNumber,
        status: m.status,
        statusCode,
        statusLabel,
        location: m.location,
        pumpingHours: m.pumpingHours,
        sapId: m.sapId ?? null,
        assetType: m.assetType ?? null,
        size: m.size ?? null,
        brandType: m.brandType ?? null,
        connection: m.connection ?? null,
      };
    });

    function mapSubComponent(sc: typeof stators[number]) {
      const { statusCode, statusLabel } = resolveStatusMeta(sc.status ?? '');
      return {
        id: sc.id,
        serialNumber: sc.serialNumber,
        sapId: sc.sapId ?? null,
        size: sc.size ?? null,
        brand: sc.brand ?? null,
        configuration: sc.configuration ?? null,
        cumulativeHours: sc.cumulativeHours,
        availabilityStatus: sc.availabilityStatus ?? null,
        status: sc.status,
        statusCode,
        statusLabel,
        currentMotor: sc.assemblies[0]?.motor ?? null,
      };
    }

    return NextResponse.json({
      query: q,
      motors: {
        results: motorResults,
        total: motorTotal,
        page,
        pageSize,
      },
      stators: {
        results: stators.map(mapSubComponent),
        total: statorTotal,
        page,
        pageSize,
      },
      rotors: {
        results: rotors.map(mapSubComponent),
        total: rotorTotal,
        page,
        pageSize,
      },
      motorSleeves: {
        results: motorSleeves.map(mapSubComponent),
        total: motorSleeveTotal,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('[GET /api/search]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while searching.' },
      { status: 500 },
    );
  }
}
