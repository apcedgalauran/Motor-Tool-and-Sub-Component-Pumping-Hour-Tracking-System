export const runtime = 'nodejs';

import { type AssetStatus, ASSET_STATUS_META } from '@/lib/asset-status';
import { normalizeSubComponentType } from '@/lib/subcomponent';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

type PatchSubComponentBody = {
  type?: string;
  serialNumber?: string;
  status?: string;
  notes?: string;
  sapId?: string | null;
  size?: string | null;
  configuration?: string | null;
  brand?: string | null;
  // Rejected fields — detected and returned as 400
  availabilityStatus?: unknown;
  assetCategory?: unknown;
};

const VALID_ASSET_STATUSES = new Set<string>(Object.keys(ASSET_STATUS_META));

function parsePatchError(error: unknown): { status: number; message: string } {
  if (error instanceof SyntaxError) {
    return { status: 400, message: 'Invalid JSON payload.' };
  }

  if (error instanceof Error) {
    const message = error.message;

    if (
      message.includes('already exists')
      || message.includes('required')
      || message.includes('invalid')
      || message.includes('Invalid status value')
      || message.includes('No valid fields')
    ) {
      return { status: 400, message };
    }

    if (
      message.includes('Record to update not found')
      || message.includes('Sub-component not found')
    ) {
      return { status: 404, message: 'Sub-component not found.' };
    }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return { status: 404, message: 'Sub-component not found.' };
    }
    if (error.code === 'P2002') {
      return { status: 400, message: 'A sub-component with this serial number already exists.' };
    }
  }

  return { status: 500, message: 'Failed to update sub-component.' };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as PatchSubComponentBody;

    // Reject fields that are no longer accepted by this endpoint
    if ('availabilityStatus' in body) {
      return NextResponse.json(
        { error: 'availabilityStatus is not an accepted field for this endpoint.' },
        { status: 400 }
      );
    }
    if ('assetCategory' in body) {
      return NextResponse.json(
        { error: 'assetCategory is not an accepted field for this endpoint.' },
        { status: 400 }
      );
    }

    const updateData: Prisma.SubComponentUncheckedUpdateInput = {};
    let touchedAnyField = false;

    if (body.type !== undefined) {
      if (typeof body.type !== 'string') throw new Error('Type must be a string.');
      updateData.type = normalizeSubComponentType(body.type);
      touchedAnyField = true;
    }

    if (body.serialNumber !== undefined) {
      if (typeof body.serialNumber !== 'string') throw new Error('Serial Number must be a string.');
      const trimmed = body.serialNumber.trim();
      if (!trimmed) throw new Error('Serial Number is required.');

      const duplicate = await prisma.subComponent.findFirst({
        where: { serialNumber: trimmed, id: { not: id } },
        select: { id: true },
      });
      if (duplicate) {
        throw new Error('A sub-component with this serial number already exists.');
      }

      updateData.serialNumber = trimmed;
      touchedAnyField = true;
    }

    if (body.status !== undefined) {
      if (typeof body.status !== 'string') throw new Error('Status must be a string.');
      const trimmed = body.status.trim();
      if (!VALID_ASSET_STATUSES.has(trimmed)) {
        return NextResponse.json({ error: 'Invalid status value.' }, { status: 400 });
      }
      updateData.status = trimmed as AssetStatus;
      touchedAnyField = true;
    }

    if (body.notes !== undefined) {
      if (typeof body.notes !== 'string') throw new Error('Notes must be a string.');
      const trimmed = body.notes.trim();
      updateData.notes = trimmed || null;
      touchedAnyField = true;
    }

    if (body.sapId !== undefined) {
      if (body.sapId !== null && typeof body.sapId !== 'string') {
        throw new Error('SAP ID must be a string.');
      }
      const trimmed = body.sapId?.trim() ?? '';
      updateData.sapId = trimmed || null;
      touchedAnyField = true;
    }

    if (body.size !== undefined) {
      if (body.size !== null && typeof body.size !== 'string') {
        throw new Error('Size must be a string.');
      }
      const trimmed = body.size?.trim() ?? '';
      updateData.size = trimmed || null;
      touchedAnyField = true;
    }

    if (body.configuration !== undefined) {
      if (body.configuration !== null && typeof body.configuration !== 'string') {
        throw new Error('Configuration must be a string.');
      }
      const trimmed = body.configuration?.trim() ?? '';
      updateData.configuration = trimmed || null;
      touchedAnyField = true;
    }

    if (body.brand !== undefined) {
      if (body.brand !== null && typeof body.brand !== 'string') {
        throw new Error('Brand must be a string.');
      }
      const trimmed = body.brand?.trim() ?? '';
      updateData.brand = trimmed || null;
      touchedAnyField = true;
    }

    if (!touchedAnyField) {
      throw new Error('No valid fields to update.');
    }

    const updated = await prisma.subComponent.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/sub-components');
    revalidatePath(`/sub-components/${id}`);

    return NextResponse.json({ subComponent: updated }, { status: 200 });
  } catch (error) {
    const parsed = parsePatchError(error);
    return NextResponse.json({ error: parsed.message }, { status: parsed.status });
  }
}
