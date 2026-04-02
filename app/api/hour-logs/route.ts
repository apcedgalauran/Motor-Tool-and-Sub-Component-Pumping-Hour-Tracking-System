export const runtime = 'nodejs';

import { auth } from '@/auth';
import { getInstalledMotorForSubComponent, logPumpingHoursCascade } from '@/lib/hour-logs';
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
    ) {
      return { status: 400, message };
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
    let targetMotorId = providedMotorId;

    if (subComponentId) {
      const activeAssembly = await getInstalledMotorForSubComponent(subComponentId);
      if (!activeAssembly) {
        return NextResponse.json(
          { error: 'Sub-component must be installed in a motor to log hours.' },
          { status: 400 }
        );
      }
      targetMotorId = activeAssembly.motorId;
    }

    if (!targetMotorId) {
      return NextResponse.json(
        { error: 'Either motorId or subComponentId is required.' },
        { status: 400 }
      );
    }

    const result = await logPumpingHoursCascade({
      motorId: targetMotorId,
      userId: session.user.id,
      hoursAdded: Number(body.hoursAdded),
      rigName: body.rigName ?? '',
      wellNumber: body.wellNumber ?? '',
      notes: body.notes,
    });

    revalidatePath(`/motors/${targetMotorId}`);
    revalidatePath('/sub-components');
    revalidatePath('/');

    if (subComponentId) {
      revalidatePath(`/sub-components/${subComponentId}`);
    }

    return NextResponse.json(
      {
        motorId: targetMotorId,
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
