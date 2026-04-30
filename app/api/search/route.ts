export const runtime = 'nodejs';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
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

    // Return empty results immediately when query is blank.
    if (!q.trim()) {
      return NextResponse.json({
        query: q,
        motors: { results: [], total: 0, page, pageSize },
        subComponents: { results: [], total: 0, page, pageSize },
      });
    }

    const isSqlite = process.env.DATABASE_URL?.startsWith('file:') || process.env.DATABASE_URL?.includes('sqlite');
    const serialFilter = {
      serialNumber: {
        contains: q,
        ...(isSqlite ? {} : { mode: 'insensitive' as const }),
      },
    };

    const [
      motors,
      motorTotal,
      subComponents,
      subComponentTotal,
    ] = await Promise.all([
      prisma.motor.findMany({
        where: serialFilter,
        skip,
        take: pageSize,
        orderBy: { serialNumber: 'asc' },
        select: {
          id: true,
          name: true,
          serialNumber: true,
          status: true,
          location: true,
          customStatus: {
            select: {
              label: true,
              color: true,
            },
          },
        },
      }),

      prisma.motor.count({ where: serialFilter }),

      prisma.subComponent.findMany({
        where: serialFilter,
        skip,
        take: pageSize,
        orderBy: { serialNumber: 'asc' },
        select: {
          id: true,
          type: true,
          serialNumber: true,
          cumulativeHours: true,
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
        },
      }),

      prisma.subComponent.count({ where: serialFilter }),
    ]);

    const motorResults = motors.map((m) => ({
      id: m.id,
      name: m.name,
      serialNumber: m.serialNumber,
      status: m.status,
      location: m.location,
      customStatus: m.customStatus ?? null,
    }));

    const subComponentResults = subComponents.map((sc) => ({
      id: sc.id,
      type: sc.type,
      serialNumber: sc.serialNumber,
      cumulativeHours: sc.cumulativeHours,
      status: sc.status,
      currentMotor: sc.assemblies[0]?.motor ?? null,
    }));

    return NextResponse.json({
      query: q,
      motors: {
        results: motorResults,
        total: motorTotal,
        page,
        pageSize,
      },
      subComponents: {
        results: subComponentResults,
        total: subComponentTotal,
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
