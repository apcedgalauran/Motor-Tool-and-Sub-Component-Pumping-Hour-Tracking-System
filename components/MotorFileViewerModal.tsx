'use client';

import { classifyMotorFile, formatFileSize } from '@/lib/motor-files';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type MotorFileRecord = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  createdAt: string | Date;
};

type MotorFileViewerModalProps = {
  motorId: string;
  file: MotorFileRecord | null;
  onClose: () => void;
};

function formatDateTime(value: Date | string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MotorFileViewerModal({ motorId, file, onClose }: MotorFileViewerModalProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // Resolve the portal target on the client only (SSR-safe)
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  // Lock background scrolling while the modal is open
  useEffect(() => {
    if (!file) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [file]);

  // Close on Escape key
  useEffect(() => {
    if (!file) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('keydown', onEscape);
    };
  }, [file, onClose]);

  if (!file || !portalTarget) {
    return null;
  }

  const viewerKind = classifyMotorFile(file.fileName, file.mimeType);
  const contentUrl = `/api/motors/${motorId}/files/${file.id}/content`;
  const downloadUrl = `${contentUrl}?download=1`;

  const modalContent = (
    <div
      className="fixed inset-0 w-screen h-screen z-[100] bg-black/60 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="motor-file-viewer-title"
        className="w-full max-w-6xl min-w-0 max-h-[90vh] overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-4 sm:p-5 border-b border-[var(--border)] shrink-0">
          <div className="min-w-0">
            <h2 id="motor-file-viewer-title" className="text-base sm:text-lg font-semibold text-[#121212] truncate">
              {file.fileName}
            </h2>
            <p className="text-xs text-[#333333] mt-1">
              {formatFileSize(file.fileSize)} | Uploaded {formatDateTime(file.createdAt)}
            </p>
          </div>

          <button
            type="button"
            aria-label="Close file viewer"
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-[var(--border)] text-[#333333] hover:bg-[var(--card-hover)] transition-colors shrink-0"
          >
            X
          </button>
        </div>

        {/* Content — scrollable within the modal */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-[var(--background)]">
          {viewerKind === 'pdf' && (
            <iframe
              src={contentUrl}
              title={file.fileName}
              className="w-full h-[70vh] min-h-[420px] rounded-lg border border-[var(--border)] bg-white"
            />
          )}

          {viewerKind === 'image' && (
            <div className="min-h-[50vh] flex items-center justify-center overflow-auto">
              <img
                src={contentUrl}
                alt={file.fileName}
                onClick={() => setIsZoomed((current) => !current)}
                className={`rounded-lg border border-[var(--border)] cursor-zoom-in transition-transform duration-200 ${
                  isZoomed
                    ? 'scale-[1.8] max-w-none max-h-none cursor-zoom-out'
                    : 'max-w-full max-h-full object-contain'
                }`}
              />
            </div>
          )}

          {viewerKind === 'video' && (
            <div className="min-h-[50vh] flex items-center justify-center">
              <video
                src={contentUrl}
                controls
                className="max-w-full max-h-[70vh] rounded-lg border border-[var(--border)] bg-black"
              >
                Your browser does not support HTML5 video playback.
              </video>
            </div>
          )}

          {viewerKind === 'download' && (
            <div className="min-h-[50vh] flex items-center justify-center">
              <div className="w-full max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 text-center">
                <p className="text-xs uppercase tracking-wider text-[#333333]">Preview not available</p>
                <p className="text-base font-semibold text-[#121212] mt-2 break-words">{file.fileName}</p>
                <p className="text-sm text-[#333333] mt-1">{file.mimeType}</p>
                <p className="text-sm text-[#333333] mt-1">{formatFileSize(file.fileSize)}</p>

                <a
                  href={downloadUrl}
                  className="inline-flex items-center justify-center mt-5 px-5 py-2.5 rounded-lg bg-[#9E9EB0] text-white text-sm font-semibold hover:bg-[#85859a] transition-colors"
                >
                  Download
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, portalTarget);
}
