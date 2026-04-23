'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface DeleteFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  motorId: string;
  file: {
    id: string;
    fileName: string;
  } | null;
}

export function DeleteFileModal({
  isOpen,
  onClose,
  onSuccess,
  motorId,
  file,
}: DeleteFileModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Resolve portal target on the client only (SSR-safe)
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  // Reset error state whenever the modal opens with a new file
  useEffect(() => {
    if (isOpen) {
      setError('');
      setIsDeleting(false);
    }
  }, [isOpen, file?.id]);

  // Lock background scrolling while the modal is open
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Close on Escape key (only when not mid-delete)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isDeleting, onClose]);

  // Auto-focus the Cancel button when the modal opens for accessibility
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
  }, [isOpen]);

  const handleDelete = useCallback(async () => {
    if (!file || isDeleting) return;

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(
        `/api/motors/${motorId}/files/${file.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(
          payload?.error || 'Failed to delete file. Please try again.'
        );
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to delete file. Please try again.'
      );
    } finally {
      setIsDeleting(false);
    }
  }, [file, isDeleting, motorId, onSuccess, onClose]);

  if (!isOpen || !file || !portalTarget) {
    return null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 w-screen h-screen z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-file-modal-title"
        aria-describedby="delete-file-modal-description"
        className="w-full max-w-md mx-4 bg-white dark:bg-zinc-900 border border-[var(--border)] rounded-xl shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 pb-3">
          <div className="flex items-center gap-3 mb-3">
            {/* Warning icon */}
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <h2
              id="delete-file-modal-title"
              className="text-lg font-bold text-[#121212] dark:text-zinc-100"
            >
              Delete File?
            </h2>
          </div>

          <p
            id="delete-file-modal-description"
            className="text-sm text-[#333333] dark:text-zinc-400 leading-relaxed"
          >
            Are you sure you want to delete{' '}
            <span className="font-semibold text-[#121212] dark:text-zinc-200 break-all">
              {file.fileName}
            </span>
            ? This action cannot be undone and will permanently remove the file
            from storage.
          </p>
        </div>

        {/* Inline error */}
        {error && (
          <div className="mx-5 mb-3 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[var(--border)]">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[#333333] dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDeleting && (
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, portalTarget);
}
