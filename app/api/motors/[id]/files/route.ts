export const runtime = 'nodejs';

import { head } from '@vercel/blob';
import { auth } from '@/auth';
import {
  MAX_MOTOR_FILE_SIZE_BYTES,
  isAllowedMotorFileExtension,
  isAllowedMotorFileMimeType,
} from '@/lib/motor-files';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

type FinalizeMotorFileBody = {
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  storageUrl?: string;
};

function parseBadRequest(error: unknown): string | null {
  if (!(error instanceof Error)) return null;

  if (
    error.message.includes('required')
    || error.message.includes('must be')
    || error.message.includes('Unsupported')
    || error.message.includes('too large')
    || error.message.includes('Invalid storage URL')
    || error.message.includes('Blob metadata mismatch')
  ) {
    return error.message;
  }

  return null;
}

function parseFinalizeBody(body: FinalizeMotorFileBody) {
  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
  const storageUrl = typeof body.storageUrl === 'string' ? body.storageUrl.trim() : '';
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : '';
  const fileSize = typeof body.fileSize === 'number' ? body.fileSize : Number.NaN;

  if (!fileName) throw new Error('fileName is required.');
  if (!storageUrl) throw new Error('storageUrl is required.');
  if (!mimeType) throw new Error('mimeType is required.');
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    throw new Error('fileSize must be a positive number.');
  }

  if (!storageUrl.includes('.blob.vercel-storage.com/')) {
    throw new Error('Invalid storage URL.');
  }

  if (!isAllowedMotorFileExtension(fileName)) {
    throw new Error('Unsupported file extension.');
  }

  if (!isAllowedMotorFileMimeType(mimeType)) {
    throw new Error('Unsupported MIME type.');
  }

  if (fileSize > MAX_MOTOR_FILE_SIZE_BYTES) {
    throw new Error('File is too large.');
  }

  return {
    fileName,
    storageUrl,
    mimeType,
    fileSize,
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await context.params;

    const motor = await prisma.motor.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!motor) {
      return NextResponse.json({ error: 'Motor not found.' }, { status: 404 });
    }

    const files = await prisma.motorFile.findMany({
      where: { motorId: id },
      include: {
        uploader: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ files }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch files.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await context.params;

    const motor = await prisma.motor.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!motor) {
      return NextResponse.json({ error: 'Motor not found.' }, { status: 404 });
    }

    const body = (await request.json()) as FinalizeMotorFileBody;
    const parsed = parseFinalizeBody(body);

    const blobMeta = await head(parsed.storageUrl);
    if (blobMeta.size > MAX_MOTOR_FILE_SIZE_BYTES) {
      throw new Error('File is too large.');
    }

    if (parsed.fileSize !== blobMeta.size) {
      throw new Error('Blob metadata mismatch.');
    }

    const canonicalMimeType = (blobMeta.contentType || parsed.mimeType).toLowerCase();
    if (!isAllowedMotorFileMimeType(canonicalMimeType)) {
      throw new Error('Unsupported MIME type.');
    }

    const created = await prisma.motorFile.create({
      data: {
        motorId: id,
        fileName: parsed.fileName,
        fileSize: blobMeta.size,
        mimeType: canonicalMimeType,
        storageUrl: parsed.storageUrl,
        uploadedBy: session.user.id,
      },
      include: {
        uploader: {
          select: { id: true, name: true },
        },
      },
    });

    revalidatePath('/motors');
    revalidatePath(`/motors/${id}`);

    return NextResponse.json({ file: created }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const badRequest = parseBadRequest(error);
    if (badRequest) {
      return NextResponse.json({ error: badRequest }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to finalize file upload.' }, { status: 500 });
  }
}
