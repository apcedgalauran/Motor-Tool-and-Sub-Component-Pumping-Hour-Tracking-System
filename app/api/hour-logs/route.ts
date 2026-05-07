export const runtime = 'nodejs';

import { auth } from '@/auth';
import { TERMINAL_STATUSES } from '@/lib/asset-status';
import { logPumpingHoursCascade, logSubComponentHoursIsolated } from '@/lib/hour-logs';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

type HourLogRequestBody = {
  motorId?: string;
  subComponentId?: string;
  hoursAdded?: number;
  rigName?: string;
  wellNumber?: string;
  notes?: string;
};

function parseError(error: unknown): { status: number; message: string } {
  if (error instanceof SyntaxError) {
    return { status: 400, message: 'Invalid JSON payload.' };
  }

  if (error instanceof Error) {
    const message = error.message;

    if (message === 'Not authenticated') {
      return { status: 401, message };
    }

    if (
      message.includes('required')
      || message.includes('positive number')
      || message.includes('installed in a motor')
      || message.includes('Cannot log hours on a part with status')
    ) {
      return { status: 400, message };
    }

    if (message.includes('Sub-component not found')) {
      return { status: 404, message: 'Sub-component not found.' };
    }

    if (message.includes('Record to update not found')) {
      return { status: 404, message: 'Motor not found.' };
    }

    return { status: 500, message: 'Failed to log hours.' };
  }

  return { status: 500, message: 'Failed to log hours.' };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = (await request.json()) as HourLogRequestBody;

    const subComponentId = typeof body.subComponentId === 'string' ? body.subComponentId.trim() : '';
    const providedMotorId = typeof body.motorId === 'string' ? body.motorId.trim() : '';

    if (subComponentId) {
      // §10.8: Block hours logging on terminal-status parts (LOST_IN_HOLE, SCRAP).
      // QUARANTINE is excluded here per PRD — only assembly is blocked, not hour logging.
      const subComponent = await prisma.subComponent.findUnique({
        where: { id: subComponentId },
        select: { id: true, status: true },
      });

      if (!subComponent) {
        return NextResponse.json({ error: 'Sub-component not found.' }, { status: 404 });
      }

      const terminalBlockList = TERMINAL_STATUSES.filter(
        (s) => s === 'LOST_IN_HOLE' || s === 'SCRAP'
      );

      if (subComponent.status && terminalBlockList.includes(subComponent.status as typeof terminalBlockList[number])) {
        return NextResponse.json(
          { error: `Cannot log hours on a part with status ${subComponent.status}.` },
          { status: 400 }
        );
      }

      const result = await logSubComponentHoursIsolated({
        subComponentId,
        userId: session.user.id,
        hoursAdded: Number(body.hoursAdded),
        rigName: body.rigName ?? '',
        wellNumber: body.wellNumber ?? '',
        notes: body.notes,
      });

      revalidatePath(`/motors/${result.motorId}`);
      revalidatePath('/sub-components');
      revalidatePath('/');
      revalidatePath(`/sub-components/${subComponentId}`);

      return NextResponse.json(
        {
          mode: 'sub-component',
          motorId: result.motorId,
          subComponentId: result.subComponentId,
          totalAfter: result.totalAfter,
          subComponentsUpdated: result.subComponentsUpdated,
          motorUpdated: false,
        },
        { status: 201 }
      );
    }

    if (!providedMotorId) {
      return NextResponse.json(
        { error: 'Either motorId or subComponentId is required.' },
        { status: 400 }
      );
    }

    const result = await logPumpingHoursCascade({
      motorId: providedMotorId,
      userId: session.user.id,
      hoursAdded: Number(body.hoursAdded),
      rigName: body.rigName ?? '',
      wellNumber: body.wellNumber ?? '',
      notes: body.notes,
    });

    revalidatePath(`/motors/${providedMotorId}`);
    revalidatePath('/sub-components');
    revalidatePath('/');

    return NextResponse.json(
      {
        mode: 'motor',
        motorId: providedMotorId,
        motor: result.motor,
        subComponentsUpdated: result.subComponentsUpdated,
      },
      { status: 201 }
    );
  } catch (error) {
    const parsed = parseError(error);
    return NextResponse.json({ error: parsed.message }, { status: parsed.status });
  }
}
