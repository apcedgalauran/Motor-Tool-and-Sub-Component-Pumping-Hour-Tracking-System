import { getStatusLabel } from '@/lib/utils';

export const MOTOR_EDITABLE_FIELDS = [
  'name',
  'serialNumber',
  'location',
  'dateOut',
  'dateIn',
  'status',
] as const;

export type MotorEditableField = (typeof MOTOR_EDITABLE_FIELDS)[number];

export type MotorChangedField = {
  previous: string | null;
  next: string | null;
};

export type MotorChangedFields = Partial<Record<MotorEditableField, MotorChangedField>>;

export type MotorEditableSnapshot = {
  name: string | null;
  serialNumber: string | null;
  location: string | null;
  dateOut: Date | string | null;
  dateIn: Date | string | null;
  status: string | null;
};

const MOTOR_FIELD_LABELS: Record<MotorEditableField, string> = {
  name: 'Motor Name/ID',
  serialNumber: 'Serial Number',
  location: 'Location',
  dateOut: 'Date Out',
  dateIn: 'Date In',
  status: 'Status',
};

function toDateInputString(value: Date | string | null | undefined): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeMotorFieldValue(
  field: MotorEditableField,
  value: Date | string | null | undefined
): string | null {
  if (field === 'dateOut' || field === 'dateIn') {
    return toDateInputString(value);
  }

  if (field === 'location') {
    return normalizeString(value as string | null | undefined);
  }

  return normalizeString(value as string | null | undefined);
}

export function buildMotorChangedFields(
  previousValues: MotorEditableSnapshot,
  nextValues: MotorEditableSnapshot
): MotorChangedFields {
  const changed: MotorChangedFields = {};

  for (const field of MOTOR_EDITABLE_FIELDS) {
    const previous = normalizeMotorFieldValue(field, previousValues[field]);
    const next = normalizeMotorFieldValue(field, nextValues[field]);

    if (previous !== next) {
      changed[field] = { previous, next };
    }
  }

  return changed;
}

export function hasMotorChangedFields(changedFields: MotorChangedFields): boolean {
  return MOTOR_EDITABLE_FIELDS.some((field) => Boolean(changedFields[field]));
}

export function parseMotorChangedFields(value: unknown): MotorChangedFields {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const parsed: MotorChangedFields = {};

  for (const field of MOTOR_EDITABLE_FIELDS) {
    const entry = source[field];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;

    const entryObject = entry as Record<string, unknown>;
    const previous = typeof entryObject.previous === 'string' ? entryObject.previous : null;
    const next = typeof entryObject.next === 'string' ? entryObject.next : null;

    parsed[field] = { previous, next };
  }

  return parsed;
}

function formatDateForSummary(value: string | null): string {
  if (!value) return 'Not set';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatSummaryValue(field: MotorEditableField, value: string | null): string {
  if (field === 'status') {
    return value ? getStatusLabel(value) : 'Not set';
  }

  if (field === 'dateOut' || field === 'dateIn') {
    return formatDateForSummary(value);
  }

  return value ?? 'Not set';
}

export function summarizeMotorChangedFields(changedFields: MotorChangedFields): string[] {
  const lines: string[] = [];

  for (const field of MOTOR_EDITABLE_FIELDS) {
    const entry = changedFields[field];
    if (!entry) continue;

    const previous = formatSummaryValue(field, entry.previous);
    const next = formatSummaryValue(field, entry.next);
    lines.push(`${MOTOR_FIELD_LABELS[field]}: ${previous} -> ${next}`);
  }

  return lines;
}
