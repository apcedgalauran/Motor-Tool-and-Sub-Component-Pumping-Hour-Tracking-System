export const runtime = 'nodejs';

import { auth } from '@/auth';
import { type AssetStatus, ASSET_STATUS_META, getStatusMeta } from '@/lib/asset-status';
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
    const q = searchParams.get('q')?.trim() ?? '';
    const statusFilter = searchParams.get('status')?.trim() ?? '';
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const pageSize = Math.min(
      parsePositiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    );
    const skip = (page - 1) * pageSize;

    const isSqlite =
      process.env.DATABASE_URL?.startsWith('file:') ||
      process.env.DATABASE_URL?.includes('sqlite');

    // Build where clause
    const where: Record<string, unknown> = { assetCategory: 'ROTOR' };

    if (q) {
      where.serialNumber = {
        contains: q,
        ...(isSqlite ? {} : { mode: 'insensitive' as const }),
      };
    }

    if (statusFilter && VALID_ASSET_STATUSES.has(statusFilter)) {
      where.status = statusFilter;
    }

    const [results, total] = await Promise.all([
      prisma.subComponent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { serialNumber: 'asc' },
        select: {
          id: true,
          serialNumber: true,
          sapId: true,
          size: true,
          brand: true,
          configuration: true,
          cumulativeHours: true,
          status: true,
          availabilityStatus: true,
          assemblies: {
            where: { dateRemoved: null },
            take: 1,
            select: {
              motor: {
                select: { id: true, name: true, serialNumber: true, location: true },
              },
            },
          },
        },
      }),
      prisma.subComponent.count({ where }),
    ]);

    const mapped = results.map((sc) => {
      const { statusCode, statusLabel } = resolveStatusMeta(sc.status ?? '');
      return {
        id: sc.id,
        serialNumber: sc.serialNumber,
        sapId: sc.sapId ?? null,
        size: sc.size ?? null,
        brand: sc.brand ?? null,
        configuration: sc.configuration ?? null,
        cumulativeHours: sc.cumulativeHours,
        status: sc.status,
        statusCode,
        statusLabel,
        availabilityStatus: sc.availabilityStatus ?? null,
        currentMotorId: sc.assemblies[0]?.motor?.id ?? null,
      };
    });

    return NextResponse.json({
      category: 'ROTOR',
      results: mapped,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[GET /api/rotors]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching rotors.' },
      { status: 500 },
    );
  }
}
