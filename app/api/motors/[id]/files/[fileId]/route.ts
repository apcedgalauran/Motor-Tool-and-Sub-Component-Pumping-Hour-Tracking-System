export const runtime = 'nodejs';

import { del } from '@vercel/blob';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id, fileId } = await context.params;

    const existingFile = await prisma.motorFile.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        motorId: true,
        storageUrl: true,
      },
    });

    if (!existingFile || existingFile.motorId !== id) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    await del(existingFile.storageUrl);

    await prisma.motorFile.delete({
      where: { id: existingFile.id },
    });

    revalidatePath('/motors');
    revalidatePath(`/motors/${id}`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete file.' }, { status: 500 });
  }
}
