import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    motor: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    customStatus: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { auth } from '@/auth';
import { PATCH } from '@/app/api/motors/[id]/route';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

describe('PATCH /api/motors/[id]', () => {
  const tx = {
    motor: {
      update: vi.fn(),
    },
    motorEditLog: {
      create: vi.fn(),
    },
  };

  const existingMotor = {
    id: 'motor-1',
    name: 'Motor 100',
    serialNumber: 'SN-100',
    location: 'Abu Dhabi',
    dateOut: new Date('2026-04-01T00:00:00.000Z'),
    dateIn: null,
    status: 'ON_LOCATION',
    customStatusId: null,
    pumpingHours: 120,
    customStatus: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);
    vi.mocked(prisma.motor.findUnique).mockResolvedValue(existingMotor as never);
    vi.mocked(prisma.motor.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.customStatus.findUnique).mockResolvedValue(null as never);

    tx.motor.update.mockResolvedValue({
      ...existingMotor,
      location: 'Dubai',
      status: 'IN_BASE',
      customStatus: null,
    });
    tx.motorEditLog.create.mockResolvedValue({ id: 'log-1' });

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: never) => {
      return callback(tx as never);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates a motor and writes a MotorEditLog entry', async () => {
    const request = new Request('http://localhost/api/motors/motor-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'Dubai',
        status: 'IN_BASE',
      }),
    });

    const response = await PATCH(request as never, {
      params: Promise.resolve({ id: 'motor-1' }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.motor.location).toBe('Dubai');
    expect(payload.motor.status).toBe('IN_BASE');

    expect(tx.motorEditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          motorId: 'motor-1',
          userId: 'user-1',
          changedFields: expect.objectContaining({
            location: { previous: 'Abu Dhabi', next: 'Dubai' },
            status: { previous: 'ON_LOCATION', next: 'IN_BASE' },
          }),
        }),
      })
    );

    expect(revalidatePath).toHaveBeenCalledWith('/');
    expect(revalidatePath).toHaveBeenCalledWith('/motors');
    expect(revalidatePath).toHaveBeenCalledWith('/motors/motor-1');
  });

  it('returns 400 for invalid date input', async () => {
    const request = new Request('http://localhost/api/motors/motor-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateOut: 'not-a-date',
      }),
    });

    const response = await PATCH(request as never, {
      params: Promise.resolve({ id: 'motor-1' }),
    });

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toContain('Date Out must be a valid date.');
  });

  it('returns 400 when no valid fields are provided', async () => {
    const request = new Request('http://localhost/api/motors/motor-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await PATCH(request as never, {
      params: Promise.resolve({ id: 'motor-1' }),
    });

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toContain('No valid fields to update.');
  });

  it('records previous and next values for changed fields in MotorEditLog', async () => {
    tx.motor.update.mockResolvedValue({
      ...existingMotor,
      name: 'Motor 200',
      dateIn: new Date('2026-04-10T00:00:00.000Z'),
      status: 'FOR_MAINTENANCE',
      customStatus: null,
    });

    const request = new Request('http://localhost/api/motors/motor-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Motor 200',
        dateIn: '2026-04-10',
        status: 'FOR_MAINTENANCE',
      }),
    });

    const response = await PATCH(request as never, {
      params: Promise.resolve({ id: 'motor-1' }),
    });

    expect(response.status).toBe(200);

    expect(tx.motorEditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          changedFields: expect.objectContaining({
            name: { previous: 'Motor 100', next: 'Motor 200' },
            dateIn: { previous: null, next: '2026-04-10' },
            status: { previous: 'ON_LOCATION', next: 'FOR_MAINTENANCE' },
          }),
        }),
      })
    );
  });
});
