'use server';

import { prisma } from '@/lib/prisma';
import { SubComponentType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function createSubComponent(data: {
  type: string;
  serialNumber: string;
  notes?: string;
}) {
  const subComponent = await prisma.subComponent.create({
    data: {
      type: data.type as SubComponentType,
      serialNumber: data.serialNumber,
      notes: data.notes || null,
    },
  });

  revalidatePath('/sub-components');
  return subComponent;
}

export async function updateSubComponent(
  id: string,
  data: {
    serialNumber?: string;
    notes?: string;
    status?: string;
  }
) {
  const subComponent = await prisma.subComponent.update({
    where: { id },
    data: {
      ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });

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
