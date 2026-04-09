import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    motor: {
      findMany: vi.fn(),
    },
    subComponent: {
      findMany: vi.fn(),
    },
    customStatus: {
      findMany: vi.fn(),
    },
  },
}));

import { POST } from '@/app/api/export/route';
import { prisma } from '@/lib/prisma';

describe('POST /api/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    vi.mocked(prisma.motor.findMany).mockResolvedValue([
      {
        id: 'motor-1',
        name: 'Motor Alpha',
        serialNumber: 'SN-100',
        location: 'Rig 7',
        status: 'ON_LOCATION',
        pumpingHours: 145.5,
        dateOut: new Date('2026-04-01T00:00:00.000Z'),
        dateIn: null,
        _count: {
          assemblies: 3,
        },
      },
    ] as never);

    vi.mocked(prisma.subComponent.findMany).mockResolvedValue([
      {
        id: 'part-1',
        type: 'ROTOR',
        serialNumber: 'P-100',
        cumulativeHours: 42,
        status: 'ACTIVE',
        assemblies: [
          {
            motorId: 'motor-1',
            dateAssembled: new Date('2026-04-02T00:00:00.000Z'),
            dateRemoved: null,
          },
        ],
      },
    ] as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a non-empty PDF file for motors export', async () => {
    const request = new Request('http://localhost/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'motors',
        format: 'PDF',
        fields: ['name', 'serialNumber', 'status'],
        filters: {
          statuses: ['ON_LOCATION'],
          dateOutFrom: '2026-04-01',
          dateOutTo: '2026-04-30',
          minHours: 100,
        },
      }),
    });

    const response = await POST(request as never);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/pdf');
    expect(response.headers.get('content-disposition')).toContain('.pdf');

    const pdfBuffer = Buffer.from(await response.arrayBuffer());

    expect(pdfBuffer.length).toBeGreaterThan(200);
    expect(pdfBuffer.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });

  it('returns a CSV file for parts export', async () => {
    const request = new Request('http://localhost/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'parts',
        format: 'CSV',
        fields: ['type', 'serialNumber', 'status', 'currentMotor'],
        filters: {
          statuses: ['INSTALLED'],
        },
      }),
    });

    const response = await POST(request as never);
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('content-disposition')).toContain('parts-export-');
    expect(csv).toContain('Component Type,Serial Number,Status,Current Motor');
    expect(csv).toContain('Rotor,P-100,INSTALLED,Motor Alpha');
  });

  it('returns a non-empty PDF file for parts export', async () => {
    const request = new Request('http://localhost/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'parts',
        format: 'PDF',
        fields: ['type', 'serialNumber', 'status'],
        filters: {},
      }),
    });

    const response = await POST(request as never);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/pdf');
    expect(response.headers.get('content-disposition')).toContain('.pdf');

    const pdfBuffer = Buffer.from(await response.arrayBuffer());
    expect(pdfBuffer.length).toBeGreaterThan(200);
    expect(pdfBuffer.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });

  it('returns an API error payload when parts export crashes', async () => {
    vi.mocked(prisma.subComponent.findMany).mockRejectedValueOnce(new Error('Query failure'));

    const request = new Request('http://localhost/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'parts',
        format: 'CSV',
        fields: ['type'],
        filters: {},
      }),
    });

    const response = await POST(request as never);
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(500);
    expect(payload.error).toContain('Failed to export parts.');
  });
});