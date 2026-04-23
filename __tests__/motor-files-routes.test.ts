import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@vercel/blob', () => ({
  head: vi.fn(),
  del: vi.fn(),
  get: vi.fn(),
}));

vi.mock('@vercel/blob/client', () => ({
  handleUpload: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    motor: {
      findUnique: vi.fn(),
    },
    motorFile: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { del, get, head } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';
import { prisma } from '@/lib/prisma';
import { GET as listFiles, POST as finalizeFile } from '@/app/api/motors/[id]/files/route';
import { DELETE as deleteFile } from '@/app/api/motors/[id]/files/[fileId]/route';
import { GET as getFileContent } from '@/app/api/motors/[id]/files/[fileId]/content/route';
import { POST as getUploadToken } from '@/app/api/motors/[id]/files/upload/route';

describe('Motor file API routes', () => {
  const motorFileRecord = {
    id: 'file-1',
    motorId: 'motor-1',
    fileName: 'report.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    storageUrl: 'https://example.private.blob.vercel-storage.com/motors/motor-1/report.pdf',
    uploadedBy: 'user-1',
    createdAt: '2026-04-22T12:00:00.000Z',
    uploader: { id: 'user-1', name: 'Rei' },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);
    vi.mocked(prisma.motor.findUnique).mockResolvedValue({ id: 'motor-1' } as never);

    vi.mocked(prisma.motorFile.findMany).mockResolvedValue([motorFileRecord] as never);
    vi.mocked(prisma.motorFile.create).mockResolvedValue(motorFileRecord as never);
    vi.mocked(prisma.motorFile.findUnique).mockResolvedValue({
      id: 'file-1',
      motorId: 'motor-1',
      fileName: 'report.pdf',
      mimeType: 'application/pdf',
      storageUrl: 'https://example.private.blob.vercel-storage.com/motors/motor-1/report.pdf',
    } as never);
    vi.mocked(prisma.motorFile.delete).mockResolvedValue({ id: 'file-1' } as never);

    vi.mocked(head).mockResolvedValue({
      size: 1024,
      contentType: 'application/pdf',
    } as never);

    vi.mocked(get).mockResolvedValue({
      stream: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      }),
      blob: {
        contentType: 'application/pdf',
      },
    } as never);

    vi.mocked(handleUpload).mockResolvedValue({
      type: 'blob.generate-client-token',
      clientToken: 'token-1',
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when listing files without authentication', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const response = await listFiles(new Request('http://localhost/api/motors/motor-1/files') as never, {
      params: Promise.resolve({ id: 'motor-1' }),
    });

    expect(response.status).toBe(401);
  });

  it('returns files for a motor in newest-first order', async () => {
    const response = await listFiles(new Request('http://localhost/api/motors/motor-1/files') as never, {
      params: Promise.resolve({ id: 'motor-1' }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.files).toHaveLength(1);
    expect(payload.files[0].id).toBe('file-1');

    expect(prisma.motorFile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { motorId: 'motor-1' },
        orderBy: { createdAt: 'desc' },
      })
    );
  });

  it('finalizes an uploaded blob and creates a MotorFile record', async () => {
    const request = new Request('http://localhost/api/motors/motor-1/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'report.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storageUrl: 'https://example.private.blob.vercel-storage.com/motors/motor-1/report.pdf',
      }),
    });

    const response = await finalizeFile(request as never, {
      params: Promise.resolve({ id: 'motor-1' }),
    });

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.file.id).toBe('file-1');

    expect(head).toHaveBeenCalledWith(
      'https://example.private.blob.vercel-storage.com/motors/motor-1/report.pdf'
    );
    expect(prisma.motorFile.create).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/motors');
    expect(revalidatePath).toHaveBeenCalledWith('/motors/motor-1');
  });

  it('returns 400 for unsupported file extension in finalize endpoint', async () => {
    const request = new Request('http://localhost/api/motors/motor-1/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'report.exe',
        fileSize: 1024,
        mimeType: 'application/pdf',
        storageUrl: 'https://example.private.blob.vercel-storage.com/motors/motor-1/report.exe',
      }),
    });

    const response = await finalizeFile(request as never, {
      params: Promise.resolve({ id: 'motor-1' }),
    });

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toContain('Unsupported file extension');
    expect(prisma.motorFile.create).not.toHaveBeenCalled();
  });

  it('deletes blob and database record for DELETE /api/motors/[id]/files/[fileId]', async () => {
    const response = await deleteFile(
      new Request('http://localhost/api/motors/motor-1/files/file-1', { method: 'DELETE' }) as never,
      { params: Promise.resolve({ id: 'motor-1', fileId: 'file-1' }) }
    );

    expect(response.status).toBe(200);
    expect(del).toHaveBeenCalledWith(
      'https://example.private.blob.vercel-storage.com/motors/motor-1/report.pdf'
    );
    expect(prisma.motorFile.delete).toHaveBeenCalledWith({ where: { id: 'file-1' } });
  });

  it('streams private blob content through authenticated content endpoint', async () => {
    const response = await getFileContent(
      new Request('http://localhost/api/motors/motor-1/files/file-1/content?download=1') as never,
      { params: Promise.resolve({ id: 'motor-1', fileId: 'file-1' }) }
    );

    expect(response.status).toBe(200);
    expect(get).toHaveBeenCalledWith(
      'https://example.private.blob.vercel-storage.com/motors/motor-1/report.pdf',
      { access: 'private' }
    );
    expect(response.headers.get('content-disposition')).toContain('attachment');
  });

  it('returns upload token payload from upload route', async () => {
    const request = new Request('http://localhost/api/motors/motor-1/files/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'blob.generate-client-token',
        payload: {
          pathname: 'motors/motor-1/report.pdf',
        },
      }),
    });

    const response = await getUploadToken(request as never, {
      params: Promise.resolve({ id: 'motor-1' }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.type).toBe('blob.generate-client-token');
    expect(payload.clientToken).toBe('token-1');
  });
});
