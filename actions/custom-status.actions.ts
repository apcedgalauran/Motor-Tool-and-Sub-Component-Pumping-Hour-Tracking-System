'use server';

import { prisma } from '@/lib/prisma';
import { CUSTOM_STATUS_PALETTE } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

/**
 * Fetch all permanent custom statuses for dropdown population.
 */
export async function getCustomStatuses() {
  return prisma.customStatus.findMany({
    where: { isPermanent: true },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Create a new custom status.
 * Auto-assigns a color from the palette based on how many custom statuses exist.
 */
export async function createCustomStatus(label: string, isPermanent: boolean) {
  const trimmed = label.trim();
  if (!trimmed) throw new Error('Status label cannot be empty.');

  // Check if already exists
  const existing = await prisma.customStatus.findUnique({
    where: { label: trimmed },
  });
  if (existing) return existing;

  // Auto-assign color from palette
  const count = await prisma.customStatus.count();
  const color = CUSTOM_STATUS_PALETTE[count % CUSTOM_STATUS_PALETTE.length];

  const status = await prisma.customStatus.create({
    data: {
      label: trimmed,
      color,
      isPermanent,
    },
  });

  revalidatePath('/');
  revalidatePath('/motors');
  return status;
}
