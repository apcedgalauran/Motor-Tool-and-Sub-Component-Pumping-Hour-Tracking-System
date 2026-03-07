'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
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

  const result = await prisma.$transaction(async (tx) => {
    // STEP 1: Increment motor's pumping hours
    const updatedMotor = await tx.motor.update({
      where: { id: motorId },
      data: { pumpingHours: { increment: hoursAdded } },
    });

    // STEP 2: Create audit log entry (includes user, rig, well)
    await tx.hourLog.create({
      data: {
        motorId,
        userId,
        hoursAdded,
        totalAfter: updatedMotor.pumpingHours,
        rigName,
        wellNumber,
        notes,
      },
    });

    // STEP 3: Find all currently assembled sub-components
    const activeAssemblies = await tx.assembly.findMany({
      where: {
        motorId,
        dateRemoved: null,
      },
    });

    // STEP 4: Cascade hours to all assembled sub-components
    const updatedSubComponents = await Promise.all(
      activeAssemblies.map((assembly) =>
        tx.subComponent.update({
          where: { id: assembly.subComponentId },
          data: { cumulativeHours: { increment: hoursAdded } },
        })
      )
    );

    return {
      motor: updatedMotor,
      subComponentsUpdated: updatedSubComponents.length,
    };
  });

  revalidatePath(`/motors/${motorId}`);
  revalidatePath('/');
  return result;
}
