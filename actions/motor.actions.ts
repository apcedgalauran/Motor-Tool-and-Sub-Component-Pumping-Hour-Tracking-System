'use server';

import { prisma } from '@/lib/prisma';
import { MotorStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function createMotor(data: {
  name: string;
  serialNumber: string;
  location?: string;
  dateOut?: string;
  dateIn?: string;
  status?: MotorStatus;
}) {
  const existing = await prisma.motor.findUnique({
    where: { serialNumber: data.serialNumber },
  });

  if (existing) {
    throw new Error('A motor with this serial number already exists.');
  }

  const motor = await prisma.motor.create({
    data: {
      name: data.name,
      serialNumber: data.serialNumber,
      location: data.location || null,
      dateOut: data.dateOut ? new Date(data.dateOut) : null,
      dateIn: data.dateIn ? new Date(data.dateIn) : null,
      status: data.status || 'ACTIVE',
    },
  });

  revalidatePath('/');
  revalidatePath('/motors');
  return motor;
}

export async function updateMotor(
  id: string,
  data: {
    name?: string;
    serialNumber?: string;
    location?: string;
    dateOut?: string | null;
    dateIn?: string | null;
    status?: MotorStatus;
  }
) {
  if (data.serialNumber !== undefined) {
    const existing = await prisma.motor.findFirst({
      where: { serialNumber: data.serialNumber, id: { not: id } },
    });

    if (existing) {
      throw new Error('A motor with this serial number already exists.');
    }
  }

  const motor = await prisma.motor.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
      ...(data.location !== undefined && { location: data.location || null }),
      ...(data.dateOut !== undefined && { dateOut: data.dateOut ? new Date(data.dateOut) : null }),
      ...(data.dateIn !== undefined && { dateIn: data.dateIn ? new Date(data.dateIn) : null }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });

  revalidatePath('/');
  revalidatePath('/motors');
  revalidatePath(`/motors/${id}`);
  return motor;
}

export async function deleteMotor(id: string) {
  // Check for active assemblies first
  const activeAssemblies = await prisma.assembly.findFirst({
    where: { motorId: id, dateRemoved: null },
  });

  if (activeAssemblies) {
    throw new Error('Cannot delete motor with active assemblies. Disassemble all sub-components first.');
  }

  await prisma.motor.delete({ where: { id } });

  revalidatePath('/');
  revalidatePath('/motors');
}

export async function getMotors() {
  return prisma.motor.findMany({
    include: {
      assemblies: {
        where: { dateRemoved: null },
        include: { subComponent: true },
      },
      _count: {
        select: {
          assemblies: { where: { dateRemoved: null } },
          hourLogs: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getMotor(id: string) {
  return prisma.motor.findUnique({
    where: { id },
    include: {
      assemblies: {
        include: { subComponent: true },
        orderBy: { dateAssembled: 'desc' },
      },
      hourLogs: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      },
    },
  });
}
