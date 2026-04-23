export const runtime = 'nodejs';

import { get } from '@vercel/blob';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

function toContentDisposition(fileName: string, asDownload: boolean): string {
  const safeName = fileName.replace(/[\r\n"]/g, '_');
  const encoded = encodeURIComponent(fileName);
  const disposition = asDownload ? 'attachment' : 'inline';
  return `${disposition}; filename="${safeName}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  request: NextRequest,
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
        fileName: true,
        mimeType: true,
        storageUrl: true,
      },
    });

    if (!existingFile || existingFile.motorId !== id) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    const blobResult = await get(existingFile.storageUrl, { access: 'private' });
    if (!blobResult || !blobResult.stream) {
      return NextResponse.json({ error: 'File content not found.' }, { status: 404 });
    }

    const downloadParam = new URL(request.url).searchParams.get('download');
    const asDownload = downloadParam === '1';

    return new NextResponse(blobResult.stream, {
      status: 200,
      headers: {
        'Content-Type': blobResult.blob.contentType || existingFile.mimeType || 'application/octet-stream',
        'Content-Disposition': toContentDisposition(existingFile.fileName, asDownload),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load file content.' }, { status: 500 });
  }
}
