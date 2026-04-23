// @vitest-environment jsdom

import { MotorFilesSection } from '@/components/MotorFilesSection';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/blob/client', () => ({
  upload: vi.fn(),
}));

describe('MotorFilesSection', () => {
  const initialFiles = [
    {
      id: 'file-image',
      fileName: 'photo.jpg',
      fileSize: 2048,
      mimeType: 'image/jpeg',
      storageUrl: 'https://example.private.blob.vercel-storage.com/motors/motor-1/photo.jpg',
      uploadedBy: 'user-1',
      createdAt: '2026-04-22T10:00:00.000Z',
      uploader: { id: 'user-1', name: 'Rei' },
    },
    {
      id: 'file-pdf',
      fileName: 'report.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      storageUrl: 'https://example.private.blob.vercel-storage.com/motors/motor-1/report.pdf',
      uploadedBy: 'user-2',
      createdAt: '2026-04-22T11:00:00.000Z',
      uploader: { id: 'user-2', name: 'Norman' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders attached files section and file rows', () => {
    render(<MotorFilesSection motorId="motor-1" initialFiles={initialFiles} />);

    expect(screen.getByText('Attached Files')).toBeTruthy();
    expect(screen.getByText('photo.jpg')).toBeTruthy();
    expect(screen.getByText('report.pdf')).toBeTruthy();
  });

  it('opens and closes the viewer modal with Escape key', async () => {
    render(<MotorFilesSection motorId="motor-1" initialFiles={initialFiles} />);

    fireEvent.click(screen.getByRole('button', { name: /photo.jpg/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('deletes a file after confirmation', async () => {
    render(<MotorFilesSection motorId="motor-1" initialFiles={initialFiles} />);

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/motors/motor-1/files/file-image', {
        method: 'DELETE',
      });
    });

    await waitFor(() => {
      expect(screen.queryByText('photo.jpg')).toBeNull();
    });
  });
});
