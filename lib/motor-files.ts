const MB = 1024 * 1024;

export const MAX_MOTOR_FILE_SIZE_BYTES = 25 * MB;

export const MOTOR_FILE_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.ppt', '.pptx',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.heic',
  '.mp4', '.mov', '.avi', '.mkv', '.webm',
  '.zip', '.json',
] as const;

export const MOTOR_FILE_ACCEPT_ATTR = MOTOR_FILE_EXTENSIONS.join(',');

export const MOTOR_FILE_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  'image/heic',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
  'application/zip',
  'application/json',
] as const;

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.heic']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm']);

export type MotorFileViewerKind = 'pdf' | 'image' | 'video' | 'download';

export function getFileExtension(fileName: string): string {
  const trimmed = fileName.trim().toLowerCase();
  const dotIndex = trimmed.lastIndexOf('.');
  if (dotIndex < 0) return '';
  return trimmed.slice(dotIndex);
}

export function isAllowedMotorFileExtension(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return MOTOR_FILE_EXTENSIONS.includes(ext as (typeof MOTOR_FILE_EXTENSIONS)[number]);
}

export function isAllowedMotorFileMimeType(mimeType: string): boolean {
  const normalized = mimeType.trim().toLowerCase();
  if (!normalized) return false;

  if (normalized.startsWith('image/')) {
    return [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml',
      'image/heic',
    ].includes(normalized);
  }

  if (normalized.startsWith('video/')) {
    return [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/webm',
    ].includes(normalized);
  }

  return MOTOR_FILE_ALLOWED_MIME_TYPES.includes(
    normalized as (typeof MOTOR_FILE_ALLOWED_MIME_TYPES)[number]
  );
}

export function classifyMotorFile(fileName: string, mimeType: string): MotorFileViewerKind {
  const ext = getFileExtension(fileName);
  const normalizedMime = mimeType.trim().toLowerCase();

  if (ext === '.pdf' || normalizedMime === 'application/pdf') {
    return 'pdf';
  }

  if (IMAGE_EXTENSIONS.has(ext) || normalizedMime.startsWith('image/')) {
    return 'image';
  }

  if (VIDEO_EXTENSIONS.has(ext) || normalizedMime.startsWith('video/')) {
    return 'video';
  }

  return 'download';
}

export function formatFileSize(fileSize: number): string {
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = fileSize;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const rounded = size >= 10 || unitIndex === 0
    ? Math.round(size)
    : Math.round(size * 10) / 10;

  return `${rounded} ${units[unitIndex]}`;
}

export function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim();
  const compact = trimmed.replace(/\s+/g, '-');
  return compact.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 160) || 'file';
}

export function buildMotorBlobPath(motorId: string, fileName: string): string {
  const safeName = sanitizeFileName(fileName);
  return `motors/${motorId}/${Date.now()}-${safeName}`;
}
