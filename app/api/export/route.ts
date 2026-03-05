import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { SUB_COMPONENT_LABELS } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');

  if (type === 'motors') {
    const motors = await prisma.motor.findMany({
      include: {
        assemblies: {
          where: { dateRemoved: null },
        },
      },
      orderBy: { name: 'asc' },
    });

    const headers = ['Name', 'Serial Number', 'Location', 'Status', 'Pumping Hours', 'Date Out', 'Date In', 'Assembled Parts'];
    const rows = motors.map((m) => [
      m.name,
      m.serialNumber,
      m.location || '',
      m.status,
      m.pumpingHours.toFixed(1),
      m.dateOut ? new Date(m.dateOut).toISOString().split('T')[0] : '',
      m.dateIn ? new Date(m.dateIn).toISOString().split('T')[0] : '',
      m.assemblies.length.toString(),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="motors-export.csv"',
      },
    });
  }

  if (type === 'sub-components') {
    const subComponents = await prisma.subComponent.findMany({
      include: {
        assemblies: {
          include: { motor: true },
          orderBy: { dateAssembled: 'desc' },
        },
      },
      orderBy: [{ type: 'asc' }, { serialNumber: 'asc' }],
    });

    const headers = ['Type', 'Serial Number', 'Cumulative Hours', 'Status', 'Current Motor', 'Total Assignments'];
    const rows = subComponents.map((sc) => {
      const activeAssembly = sc.assemblies.find((a) => !a.dateRemoved);
      const label = SUB_COMPONENT_LABELS[sc.type as keyof typeof SUB_COMPONENT_LABELS] || sc.type;
      return [
        label,
        sc.serialNumber,
        sc.cumulativeHours.toFixed(1),
        sc.status,
        activeAssembly ? activeAssembly.motor.name : 'Unassigned',
        sc.assemblies.length.toString(),
      ];
    });

    const csv = [headers.join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="sub-components-export.csv"',
      },
    });
  }

  return new Response('Invalid type parameter. Use ?type=motors or ?type=sub-components', {
    status: 400,
  });
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
