import { prisma } from '@/lib/prisma';
import { ASSET_STATUS_META, type AssetStatus } from '@/lib/asset-status';

const VALID_ASSET_STATUSES = new Set<string>(Object.keys(ASSET_STATUS_META));

export function normalizeSubComponentType(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error('Please enter a component type.');
  }

  return normalized;
}

type UpdateSubComponentInput = {
  type?: string;
  serialNumber?: string;
  notes?: string;
  status?: string;
};

export async function updateSubComponentRecord(id: string, data: UpdateSubComponentInput) {
  const updateData: {
    type?: string;
    serialNumber?: string;
    notes?: string | null;
    status?: AssetStatus;
  } = {};

  if (data.type !== undefined) {
    updateData.type = normalizeSubComponentType(data.type);
  }

  if (data.serialNumber !== undefined) {
    const serialNumber = data.serialNumber.trim();
    if (!serialNumber) {
      throw new Error('Serial Number is required.');
    }

    const existing = await prisma.subComponent.findFirst({
      where: { serialNumber, id: { not: id } },
      select: { id: true },
    });

    if (existing) {
      throw new Error('A sub-component with this serial number already exists.');
    }

    updateData.serialNumber = serialNumber;
  }

  if (data.notes !== undefined) {
    const notes = data.notes.trim();
    updateData.notes = notes ? notes : null;
  }

  if (data.status !== undefined) {
    const trimmed = data.status.trim();
    if (!VALID_ASSET_STATUSES.has(trimmed)) {
      throw new Error('Invalid status value.');
    }
    updateData.status = trimmed as AssetStatus;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('No valid fields were provided for update.');
  }

  return prisma.subComponent.update({
    where: { id },
    data: updateData,
  });
}