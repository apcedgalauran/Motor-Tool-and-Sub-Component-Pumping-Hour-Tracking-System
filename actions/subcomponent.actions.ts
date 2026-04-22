'use server';

import { prisma } from '@/lib/prisma';
import { updateSubComponentRecord } from '@/lib/subcomponent';
import { revalidatePath } from 'next/cache';

export async function createSubComponent(data: {
  type: string;
  serialNumber: string;
  notes?: string;
}) {
  const normalizedType = data.type.trim();
  if (!normalizedType) {
    throw new Error('Please enter a component type.');
  }

  const existing = await prisma.subComponent.findUnique({
    where: { serialNumber: data.serialNumber },
  });

  if (existing) {
    throw new Error('A sub-component with this serial number already exists.');
  }

  const subComponent = await prisma.subComponent.create({
    data: {
      type: normalizedType,
      serialNumber: data.serialNumber,
      status: 'ACTIVE',
      notes: data.notes || null,
    },
  });

  revalidatePath('/sub-components');
  return subComponent;
}

export async function updateSubComponent(
  id: string,
  data: {
    type?: string;
    serialNumber?: string;
    notes?: string;
    status?: string;
  }
) {
  const subComponent = await updateSubComponentRecord(id, data);

  revalidatePath('/sub-components');
  revalidatePath(`/sub-components/${id}`);
  return subComponent;
}

export async function deleteSubComponent(id: string) {
  const activeAssembly = await prisma.assembly.findFirst({
    where: { subComponentId: id, dateRemoved: null },
  });

  if (activeAssembly) {
    throw new Error('Cannot delete sub-component while it is assembled in a motor.');
  }

  await prisma.subComponent.delete({ where: { id } });

  revalidatePath('/sub-components');
}

export async function getSubComponents() {
  return prisma.subComponent.findMany({
    include: {
      assemblies: {
        where: { dateRemoved: null },
        include: { motor: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getSubComponent(id: string) {
  return prisma.subComponent.findUnique({
    where: { id },
    include: {
      assemblies: {
        include: { motor: true },
        orderBy: { dateAssembled: 'desc' },
      },
      subComponentHourLogs: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true } },
          motor: { select: { id: true, name: true, serialNumber: true } },
        },
      },
    },
  });
}

export async function getAvailableSubComponents() {
  return prisma.subComponent.findMany({
    where: {
      assemblies: {
        none: { dateRemoved: null },
      },
    },
    orderBy: [{ type: 'asc' }, { serialNumber: 'asc' }],
  });
}
