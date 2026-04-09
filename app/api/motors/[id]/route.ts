export const runtime = 'nodejs';

import { auth } from '@/auth';
import {
  buildMotorChangedFields,
  hasMotorChangedFields,
  type MotorEditableSnapshot,
} from '@/lib/motor-edit-log';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

type PatchMotorBody = {
  name?: string;
  serialNumber?: string;
  location?: string | null;
  dateOut?: string | null;
  dateIn?: string | null;
  status?: string;
  customStatusId?: string | null;
};

function parseDateInput(value: string | null, fieldLabel: string): Date | null {
  if (value === null) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldLabel} must be a valid date.`);
  }

  return parsed;
}

function formatBadRequest(error: unknown): string | null {
  if (!(error instanceof Error)) return null;

  if (
    error.message.includes('required')
    || error.message.includes('must be a valid date')
    || error.message.includes('must be a string')
    || error.message.includes('No valid fields')
    || error.message.includes('No changes detected')
    || error.message.includes('already exists')
    || error.message.includes('Invalid custom status')
  ) {
    return error.message;
  }

  return null;
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
    const userId = session.user.id;

    const { id } = await context.params;
    const body = (await request.json()) as PatchMotorBody;

    const existingMotor = await prisma.motor.findUnique({
      where: { id },
      include: { customStatus: true },
    });

    if (!existingMotor) {
      return NextResponse.json({ error: 'Motor not found.' }, { status: 404 });
    }

    const updateData: Prisma.MotorUncheckedUpdateInput = {};
    let touchedAnyField = false;

    let nextName = existingMotor.name;
    let nextSerialNumber = existingMotor.serialNumber;
    let nextLocation = existingMotor.location;
    let nextDateOut = existingMotor.dateOut;
    let nextDateIn = existingMotor.dateIn;
    let nextStatus = existingMotor.status;
    let nextCustomStatusId = existingMotor.customStatusId;

    if (body.name !== undefined) {
      if (typeof body.name !== 'string') throw new Error('Motor Name/ID must be a string.');
      const trimmed = body.name.trim();
      if (!trimmed) throw new Error('Motor Name/ID is required.');

      touchedAnyField = true;
      nextName = trimmed;
      updateData.name = trimmed;
    }

    if (body.serialNumber !== undefined) {
      if (typeof body.serialNumber !== 'string') throw new Error('Serial Number must be a string.');
      const trimmed = body.serialNumber.trim();
      if (!trimmed) throw new Error('Serial Number is required.');

      touchedAnyField = true;
      nextSerialNumber = trimmed;
      updateData.serialNumber = trimmed;
    }

    if (body.location !== undefined) {
      if (body.location !== null && typeof body.location !== 'string') {
        throw new Error('Location must be a string.');
      }

      touchedAnyField = true;
      const trimmed = body.location?.trim() ?? '';
      nextLocation = trimmed || null;
      updateData.location = nextLocation;
    }

    if (body.dateOut !== undefined) {
      if (body.dateOut !== null && typeof body.dateOut !== 'string') {
        throw new Error('Date Out must be a string.');
      }

      touchedAnyField = true;
      const parsedDateOut = parseDateInput(body.dateOut, 'Date Out');
      nextDateOut = parsedDateOut;
      updateData.dateOut = parsedDateOut;
    }

    if (body.dateIn !== undefined) {
      if (body.dateIn !== null && typeof body.dateIn !== 'string') {
        throw new Error('Date In must be a string.');
      }

      touchedAnyField = true;
      const parsedDateIn = parseDateInput(body.dateIn, 'Date In');
      nextDateIn = parsedDateIn;
      updateData.dateIn = parsedDateIn;
    }

    if (body.status !== undefined) {
      if (typeof body.status !== 'string') throw new Error('Status must be a string.');
      const trimmed = body.status.trim();
      if (!trimmed) throw new Error('Status is required.');

      touchedAnyField = true;
      nextStatus = trimmed;
      updateData.status = trimmed;
    }

    if (body.customStatusId !== undefined) {
      if (body.customStatusId !== null && typeof body.customStatusId !== 'string') {
        throw new Error('Custom status id must be a string.');
      }

      touchedAnyField = true;
      const trimmed = body.customStatusId?.trim() ?? '';
      nextCustomStatusId = trimmed || null;
      updateData.customStatusId = nextCustomStatusId;
    }

    if (!touchedAnyField) {
      throw new Error('No valid fields to update.');
    }

    if (nextSerialNumber !== existingMotor.serialNumber) {
      const duplicate = await prisma.motor.findFirst({
        where: {
          serialNumber: nextSerialNumber,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new Error('A motor with this serial number already exists.');
      }
    }

    if (nextCustomStatusId) {
      const customStatus = await prisma.customStatus.findUnique({
        where: { id: nextCustomStatusId },
      });

      if (!customStatus) {
        throw new Error('Invalid custom status selected.');
      }
    }

    const previousSnapshot: MotorEditableSnapshot = {
      name: existingMotor.name,
      serialNumber: existingMotor.serialNumber,
      location: existingMotor.location,
      dateOut: existingMotor.dateOut,
      dateIn: existingMotor.dateIn,
      status: existingMotor.status,
    };

    const nextSnapshot: MotorEditableSnapshot = {
      name: nextName,
      serialNumber: nextSerialNumber,
      location: nextLocation,
      dateOut: nextDateOut,
      dateIn: nextDateIn,
      status: nextStatus,
    };

    const changedFields = buildMotorChangedFields(previousSnapshot, nextSnapshot);

    if (!hasMotorChangedFields(changedFields)) {
      throw new Error('No changes detected.');
    }

    const updatedMotor = await prisma.$transaction(async (tx) => {
      const updated = await tx.motor.update({
        where: { id },
        data: updateData,
        include: { customStatus: true },
      });

      await tx.motorEditLog.create({
        data: {
          motorId: id,
          userId,
          changedFields: changedFields as Prisma.InputJsonValue,
        },
      });

      return updated;
    });

    revalidatePath('/');
    revalidatePath('/motors');
    revalidatePath(`/motors/${id}`);

    return NextResponse.json({ motor: updatedMotor }, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const badRequestMessage = formatBadRequest(error);
    if (badRequestMessage) {
      return NextResponse.json({ error: badRequestMessage }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'A motor with this serial number already exists.' },
          { status: 400 }
        );
      }

      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Motor not found.' }, { status: 404 });
      }
    }

    return NextResponse.json({ error: 'Failed to update motor.' }, { status: 500 });
  }
}
