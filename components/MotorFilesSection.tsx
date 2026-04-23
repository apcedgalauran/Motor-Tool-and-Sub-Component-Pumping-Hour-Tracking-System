'use client';

import { upload } from '@vercel/blob/client';
import {
  MAX_MOTOR_FILE_SIZE_BYTES,
  MOTOR_FILE_ACCEPT_ATTR,
  buildMotorBlobPath,
  classifyMotorFile,
  formatFileSize,
  isAllowedMotorFileExtension,
  isAllowedMotorFileMimeType,
} from '@/lib/motor-files';
import { formatDate } from '@/lib/utils';
import { useRef, useState } from 'react';
import { DeleteFileModal } from './DeleteFileModal';
import { MotorFileViewerModal } from './MotorFileViewerModal';

type MotorFileRecord = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  uploadedBy: string;
  createdAt: string | Date;
  uploader: {
    id: string;
    name: string | null;
  } | null;
};

type MotorFilesSectionProps = {
  motorId: string;
  initialFiles: MotorFileRecord[];
};

function getKindLabel(file: MotorFileRecord): string {
  const kind = classifyMotorFile(file.fileName, file.mimeType);

  if (kind === 'pdf') return 'PDF';
  if (kind === 'image') return 'IMG';
  if (kind === 'video') return 'VID';
  return 'DOC';
}

export function MotorFilesSection({ motorId, initialFiles }: MotorFilesSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<MotorFileRecord[]>(initialFiles);
  const [activeFile, setActiveFile] = useState<MotorFileRecord | null>(null);
  const [fileToDelete, setFileToDelete] = useState<MotorFileRecord | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleAttachFile(file: File) {
    setError('');

    if (!isAllowedMotorFileExtension(file.name)) {
      setError('Unsupported file extension for this upload.');
      return;
    }

    const mimeType = file.type.trim().toLowerCase();
    if (!isAllowedMotorFileMimeType(mimeType)) {
      setError('Unsupported file type for this upload.');
      return;
    }

    if (file.size > MAX_MOTOR_FILE_SIZE_BYTES) {
      setError(`File must be ${formatFileSize(MAX_MOTOR_FILE_SIZE_BYTES)} or smaller.`);
      return;
    }

    setUploading(true);

    try {
      const pathname = buildMotorBlobPath(motorId, file.name);

      const blob = await upload(pathname, file, {
        access: 'private',
        handleUploadUrl: `/api/motors/${motorId}/files/upload`,
        clientPayload: JSON.stringify({ originalFileName: file.name }),
        multipart: file.size > 5 * 1024 * 1024,
      });

      const finalizeResponse = await fetch(`/api/motors/${motorId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: mimeType || blob.contentType,
          storageUrl: blob.url,
        }),
      });

      if (!finalizeResponse.ok) {
        const payload = (await finalizeResponse.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Failed to attach file.');
      }

      const payload = (await finalizeResponse.json()) as { file: MotorFileRecord };
      setFiles((current) => [payload.file, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleDeleteSuccess() {
    if (fileToDelete) {
      setFiles((current) => current.filter((entry) => entry.id !== fileToDelete.id));
      if (activeFile?.id === fileToDelete.id) {
        setActiveFile(null);
      }
    }
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#121212]">Attached Files</h3>
          <p className="text-xs text-[#333333] mt-1">
            Add documents, images, videos, archives, and JSON files for this motor.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs sm:text-sm text-[#333333]">
          Maximum file size: {formatFileSize(MAX_MOTOR_FILE_SIZE_BYTES)}
        </p>

        <button
          type="button"
          onClick={openFilePicker}
          disabled={uploading}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#9E9EB0] text-white text-sm font-semibold hover:bg-[#85859a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Attach File'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={MOTOR_FILE_ACCEPT_ATTR}
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (!selected) return;
            void handleAttachFile(selected);
          }}
          className="hidden"
        />
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-600">
          {error}
        </div>
      )}

      {files.length === 0 ? (
        <p className="text-sm text-[#333333] text-center py-6">No attached files yet</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {files.map((file) => {
            const viewerKind = classifyMotorFile(file.fileName, file.mimeType);
            const kindLabel = getKindLabel(file);
            const contentUrl = `/api/motors/${motorId}/files/${file.id}/content`;

            return (
              <div
                key={file.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setActiveFile(file)}
                  className="w-full text-left p-3 hover:bg-[var(--card-hover)] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {viewerKind === 'image' ? (
                      <img
                        src={contentUrl}
                        alt={file.fileName}
                        className="w-14 h-14 rounded-md object-cover border border-[var(--border)] shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-md border border-[var(--border)] bg-[var(--card)] text-[#333333] text-xs font-semibold flex items-center justify-center shrink-0">
                        {kindLabel}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#121212] truncate" title={file.fileName}>
                        {file.fileName}
                      </p>
                      <p className="text-xs text-[#333333] mt-1">{formatFileSize(file.fileSize)}</p>
                      <p className="text-xs text-[#333333] mt-1">Uploaded {formatDate(file.createdAt)}</p>
                      <p className="text-xs text-[#333333] mt-1">By {file.uploader?.name || 'Unknown user'}</p>
                    </div>
                  </div>
                </button>

                <div className="px-3 pb-3">
                  <button
                    type="button"
                    onClick={() => setFileToDelete(file)}
                    className="w-full text-xs text-red-500 hover:text-red-600 border border-red-500/20 hover:border-red-500/40 rounded-md px-2.5 py-1.5 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MotorFileViewerModal
        key={activeFile?.id || 'motor-file-viewer'}
        motorId={motorId}
        file={activeFile}
        onClose={() => setActiveFile(null)}
      />

      <DeleteFileModal
        isOpen={fileToDelete !== null}
        onClose={() => setFileToDelete(null)}
        onSuccess={handleDeleteSuccess}
        motorId={motorId}
        file={
          fileToDelete
            ? { id: fileToDelete.id, fileName: fileToDelete.fileName }
            : null
        }
      />
    </div>
  );
}
