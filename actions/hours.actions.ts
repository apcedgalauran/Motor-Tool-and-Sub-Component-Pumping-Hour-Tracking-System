'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function logPumpingHours(
  motorId: string,
  hoursAdded: number,
  notes?: string
) {
  if (hoursAdded <= 0) throw new Error('Hours must be a positive number');

  const result = await prisma.$transaction(async (tx) => {
    // STEP 1: Increment motor's pumping hours
    const updatedMotor = await tx.motor.update({
      where: { id: motorId },
      data: { pumpingHours: { increment: hoursAdded } },
    });

    // STEP 2: Create audit log entry
    await tx.hourLog.create({
      data: {
        motorId,
        hoursAdded,
        totalAfter: updatedMotor.pumpingHours,
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
