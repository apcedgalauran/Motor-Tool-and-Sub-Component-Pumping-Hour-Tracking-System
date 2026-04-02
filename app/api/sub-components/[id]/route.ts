export const runtime = 'nodejs';

import {
  normalizeSubComponentType,
  updateSubComponentRecord,
} from '@/lib/subcomponent';
import { EDITABLE_SUB_COMPONENT_STATUSES } from '@/lib/subcomponent-shared';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

type PatchSubComponentBody = {
  type?: string;
  serialNumber?: string;
  status?: string;
};

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
      || message.includes('must be Active, In Maintenance, or Retired')
      || message.includes('No valid fields')
    ) {
      return { status: 400, message };
    }

    if (message.includes('Record to update not found')) {
      return { status: 404, message: 'Sub-component not found.' };
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

    const updatePayload: PatchSubComponentBody = {};

    if (typeof body.type === 'string') {
      updatePayload.type = normalizeSubComponentType(body.type);
    }

    if (typeof body.serialNumber === 'string') {
      updatePayload.serialNumber = body.serialNumber.trim();
    }

    if (typeof body.status === 'string') {
      const normalizedStatus = body.status.trim();
      if (!EDITABLE_SUB_COMPONENT_STATUSES.includes(normalizedStatus as never)) {
        return NextResponse.json(
          { error: 'Status must be Active, In Maintenance, or Retired.' },
          { status: 400 }
        );
      }
      updatePayload.status = normalizedStatus;
    }

    const updated = await updateSubComponentRecord(id, updatePayload);

    revalidatePath('/sub-components');
    revalidatePath(`/sub-components/${id}`);

    return NextResponse.json({ subComponent: updated }, { status: 200 });
  } catch (error) {
    const parsed = parsePatchError(error);
    return NextResponse.json({ error: parsed.message }, { status: parsed.status });
  }
}
