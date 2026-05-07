'use server';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function assembleSubComponent(
  motorId: string,
  subComponentId: string
) {
  // Validate: sub-component must not already be installed on another motor
  const existingActive = await prisma.assembly.findFirst({
    where: { subComponentId, dateRemoved: null },
  });

  if (existingActive) {
    throw new Error('This sub-component is already installed on another motor.');
  }

  // Get motor's current hours for the snapshot
  const motor = await prisma.motor.findUniqueOrThrow({
    where: { id: motorId },
  });

  const assembly = await prisma.assembly.create({
    data: {
      motorId,
      subComponentId,
      hoursAtAssembly: motor.pumpingHours,
      dateRemoved: null,
    },
  });

  // Update sub-component availability
  await prisma.subComponent.update({
    where: { id: subComponentId },
    data: { availabilityStatus: 'INSTALLED' },
  });

  revalidatePath(`/motors/${motorId}`);
  revalidatePath(`/sub-components/${subComponentId}`);
  revalidatePath('/');
  return assembly;
}

export async function disassembleSubComponent(assemblyId: string) {
  const assembly = await prisma.assembly.findUniqueOrThrow({
    where: { id: assemblyId },
    include: { motor: true },
  });

  const hoursAtRemoval = assembly.motor.pumpingHours;
  const hoursAccrued = hoursAtRemoval - assembly.hoursAtAssembly;

  await prisma.assembly.update({
    where: { id: assemblyId },
    data: {
      dateRemoved: new Date(),
      hoursAtRemoval,
      hoursAccrued,
    },
  });

  // Update sub-component availability back to available
  await prisma.subComponent.update({
    where: { id: assembly.subComponentId },
    data: { availabilityStatus: 'AVAILABLE' },
  });

  revalidatePath(`/motors/${assembly.motorId}`);
  revalidatePath(`/sub-components/${assembly.subComponentId}`);
  revalidatePath('/');
}

export async function disperseToolset(motorId: string) {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Snapshot motor's current hours
    const motor = await tx.motor.findUniqueOrThrow({ where: { id: motorId } });
    const hoursAtRemoval = motor.pumpingHours;

    // Find all active assemblies
    const active = await tx.assembly.findMany({ where: { motorId, dateRemoved: null } });
    if (active.length === 0) return;

    // Close all assemblies simultaneously
    await Promise.all(
      active.map((a) =>
        tx.assembly.update({
          where: { id: a.id },
          data: {
            dateRemoved: new Date(),
            hoursAtRemoval,
            hoursAccrued: hoursAtRemoval - a.hoursAtAssembly,
          },
        })
      )
    );

    // Update all sub-component availability back to AVAILABLE
    await Promise.all(
      active.map((a) =>
        tx.subComponent.update({
          where: { id: a.subComponentId },
          data: { availabilityStatus: 'AVAILABLE' },
        })
      )
    );
  });

  revalidatePath(`/motors/${motorId}`);
  revalidatePath('/');
}
