import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/hour-logs', () => ({
  logPumpingHoursCascade: vi.fn(),
  logSubComponentHoursIsolated: vi.fn(),
}));

import { auth } from '@/auth';
import { POST } from '@/app/api/hour-logs/route';
import { logPumpingHoursCascade, logSubComponentHoursIsolated } from '@/lib/hour-logs';
import { revalidatePath } from 'next/cache';

describe('POST /api/hour-logs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs isolated sub-component hours without motor cascade', async () => {
    vi.mocked(logSubComponentHoursIsolated).mockResolvedValue({
      motorId: 'motor-1',
      subComponentId: 'sub-1',
      totalAfter: 34.5,
      subComponentsUpdated: 1,
    } as never);

    const request = new Request('http://localhost/api/hour-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subComponentId: 'sub-1',
        hoursAdded: 4.5,
        rigName: 'Rig 11',
        wellNumber: 'Well-8',
        notes: 'Part-only adjustment',
      }),
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.mode).toBe('sub-component');
    expect(payload.motorId).toBe('motor-1');
    expect(payload.subComponentId).toBe('sub-1');
    expect(payload.totalAfter).toBe(34.5);
    expect(payload.subComponentsUpdated).toBe(1);
    expect(payload.motorUpdated).toBe(false);

    expect(logSubComponentHoursIsolated).toHaveBeenCalledWith({
      subComponentId: 'sub-1',
      userId: 'user-1',
      hoursAdded: 4.5,
      rigName: 'Rig 11',
      wellNumber: 'Well-8',
      notes: 'Part-only adjustment',
    });
    expect(logPumpingHoursCascade).not.toHaveBeenCalled();

    expect(revalidatePath).toHaveBeenCalledWith('/motors/motor-1');
    expect(revalidatePath).toHaveBeenCalledWith('/sub-components');
    expect(revalidatePath).toHaveBeenCalledWith('/');
    expect(revalidatePath).toHaveBeenCalledWith('/sub-components/sub-1');
  });

  it('logs motor hours with cascade for active assemblies', async () => {
    vi.mocked(logPumpingHoursCascade).mockResolvedValue({
      motor: {
        id: 'motor-2',
        pumpingHours: 88.5,
      },
      subComponentsUpdated: 3,
      subComponentIds: ['sub-1', 'sub-2', 'sub-3'],
    } as never);

    const request = new Request('http://localhost/api/hour-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motorId: 'motor-2',
        hoursAdded: 8.5,
        rigName: 'Rig 5',
        wellNumber: 'Well-10',
      }),
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.mode).toBe('motor');
    expect(payload.motorId).toBe('motor-2');
    expect(payload.motor.pumpingHours).toBe(88.5);
    expect(payload.subComponentsUpdated).toBe(3);

    expect(logPumpingHoursCascade).toHaveBeenCalledWith({
      motorId: 'motor-2',
      userId: 'user-1',
      hoursAdded: 8.5,
      rigName: 'Rig 5',
      wellNumber: 'Well-10',
      notes: undefined,
    });
    expect(logSubComponentHoursIsolated).not.toHaveBeenCalled();

    expect(revalidatePath).toHaveBeenCalledWith('/motors/motor-2');
    expect(revalidatePath).toHaveBeenCalledWith('/sub-components');
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });

  it('returns 400 when both motorId and subComponentId are missing', async () => {
    const request = new Request('http://localhost/api/hour-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hoursAdded: 5,
        rigName: 'Rig 1',
        wellNumber: 'Well-1',
      }),
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain('Either motorId or subComponentId is required.');
  });
});
