import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type LogPumpingHoursInput = {
  motorId: string;
  userId: string;
  hoursAdded: number;
  rigName: string;
  wellNumber: string;
  notes?: string;
};

export type LogPumpingHoursResult = {
  motor: {
    id: string;
    pumpingHours: number;
  };
  subComponentsUpdated: number;
  subComponentIds: string[];
};

export type LogSubComponentHoursIsolatedInput = {
  subComponentId: string;
  userId: string;
  hoursAdded: number;
  rigName: string;
  wellNumber: string;
  notes?: string;
};

export type LogSubComponentHoursIsolatedResult = {
  motorId: string;
  subComponentId: string;
  totalAfter: number;
  subComponentsUpdated: number;
};

function requireNonEmpty(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} is required`);
  }
  return trimmed;
}

export async function getInstalledMotorForSubComponent(subComponentId: string) {
  return prisma.assembly.findFirst({
    where: {
      subComponentId,
      dateRemoved: null,
    },
    orderBy: { dateAssembled: 'desc' },
    select: { motorId: true },
  });
}

export async function logSubComponentHoursIsolated(
  input: LogSubComponentHoursIsolatedInput
): Promise<LogSubComponentHoursIsolatedResult> {
  if (!Number.isFinite(input.hoursAdded) || input.hoursAdded <= 0) {
    throw new Error('Hours must be a positive number');
  }

  const rigName = requireNonEmpty(input.rigName, 'Rig Name');
  const wellNumber = requireNonEmpty(input.wellNumber, 'Well Number');
  const notes = input.notes?.trim() || undefined;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const activeAssembly = await tx.assembly.findFirst({
      where: {
        subComponentId: input.subComponentId,
        dateRemoved: null,
      },
      orderBy: { dateAssembled: 'desc' },
      select: { motorId: true },
    });

    if (!activeAssembly) {
      throw new Error('Sub-component must be installed in a motor to log hours.');
    }

    let updatedSubComponent: { id: string; cumulativeHours: number };

    try {
      updatedSubComponent = await tx.subComponent.update({
        where: { id: input.subComponentId },
        data: { cumulativeHours: { increment: input.hoursAdded } },
        select: { id: true, cumulativeHours: true },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        throw new Error('Sub-component not found.');
      }

      throw error;
    }

    await tx.subComponentHourLog.create({
      data: {
        subComponentId: updatedSubComponent.id,
        motorId: activeAssembly.motorId,
        userId: input.userId,
        hoursAdded: input.hoursAdded,
        totalAfter: updatedSubComponent.cumulativeHours,
        rigName,
        wellNumber,
        notes,
      },
    });

    return {
      motorId: activeAssembly.motorId,
      subComponentId: updatedSubComponent.id,
      totalAfter: updatedSubComponent.cumulativeHours,
      subComponentsUpdated: 1,
    };
  });
}

export async function logPumpingHoursCascade(input: LogPumpingHoursInput): Promise<LogPumpingHoursResult> {
  if (!Number.isFinite(input.hoursAdded) || input.hoursAdded <= 0) {
    throw new Error('Hours must be a positive number');
  }

  const rigName = requireNonEmpty(input.rigName, 'Rig Name');
  const wellNumber = requireNonEmpty(input.wellNumber, 'Well Number');
  const notes = input.notes?.trim() || undefined;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updatedMotor = await tx.motor.update({
      where: { id: input.motorId },
      data: { pumpingHours: { increment: input.hoursAdded } },
      select: { id: true, pumpingHours: true },
    });

    await tx.hourLog.create({
      data: {
        motorId: input.motorId,
        userId: input.userId,
        hoursAdded: input.hoursAdded,
        totalAfter: updatedMotor.pumpingHours,
        rigName,
        wellNumber,
        notes,
      },
    });

    const activeAssemblies = await tx.assembly.findMany({
      where: {
        motorId: input.motorId,
        dateRemoved: null,
      },
      select: { subComponentId: true },
    });

    const subComponentIds = [...new Set(activeAssemblies.map((assembly) => assembly.subComponentId))];

    if (subComponentIds.length > 0) {
      await tx.subComponent.updateMany({
        where: { id: { in: subComponentIds } },
        data: { cumulativeHours: { increment: input.hoursAdded } },
      });
    }

    return {
      motor: updatedMotor,
      subComponentsUpdated: subComponentIds.length,
      subComponentIds,
    };
  });
}