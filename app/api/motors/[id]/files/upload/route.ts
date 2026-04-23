export const runtime = 'nodejs';

import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { auth } from '@/auth';
import {
  MAX_MOTOR_FILE_SIZE_BYTES,
  MOTOR_FILE_ALLOWED_MIME_TYPES,
} from '@/lib/motor-files';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await auth();
        if (!session?.user?.id) {
          throw new Error('Not authenticated');
        }

        const motor = await prisma.motor.findUnique({
          where: { id },
          select: { id: true },
        });

        if (!motor) {
          throw new Error('Motor not found.');
        }

        if (!pathname.startsWith(`motors/${id}/`)) {
          throw new Error('Invalid upload path.');
        }

        return {
          allowedContentTypes: [...MOTOR_FILE_ALLOWED_MIME_TYPES],
          maximumSizeInBytes: MAX_MOTOR_FILE_SIZE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            motorId: id,
            userId: session.user.id,
            clientPayload: clientPayload || null,
          }),
        };
      },
      onUploadCompleted: async () => {
        // Upload finalization is handled by POST /api/motors/[id]/files.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
