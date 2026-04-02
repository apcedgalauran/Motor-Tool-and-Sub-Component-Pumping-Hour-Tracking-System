'use server';

import { auth } from '@/auth';
import { logPumpingHoursCascade } from '@/lib/hour-logs';
import { revalidatePath } from 'next/cache';

export async function logPumpingHours(
  motorId: string,
  hoursAdded: number,
  rigName: string,
  wellNumber: string,
  notes?: string
) {
  if (hoursAdded <= 0) throw new Error('Hours must be a positive number');
  if (!rigName || !rigName.trim()) throw new Error('Rig Name is required');
  if (!wellNumber || !wellNumber.trim()) throw new Error('Well Number is required');

  // Get user session BEFORE opening the transaction
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  const userId = session.user.id;

  const result = await logPumpingHoursCascade({
    motorId,
    userId,
    hoursAdded,
    rigName,
    wellNumber,
    notes,
  });

  revalidatePath(`/motors/${motorId}`);
  revalidatePath('/');

  return {
    motor: result.motor,
    subComponentsUpdated: result.subComponentsUpdated,
  };
}
