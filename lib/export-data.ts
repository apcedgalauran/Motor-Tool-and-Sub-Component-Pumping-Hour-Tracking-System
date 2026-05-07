import { getStatusLabel, MOTOR_STATUS_LABELS, SUB_COMPONENT_LABELS } from '@/lib/utils';

export type ExportDataType = 'motors' | 'parts';
export type ExportFormat = 'CSV' | 'PDF';

export type MotorExportFieldKey =
  | 'name'
  | 'serialNumber'
  | 'location'
  | 'status'
  | 'pumpingHours'
  | 'dateOut'
  | 'dateIn'
  | 'assembledParts'
  | 'sapId'
  | 'assetType'
  | 'size'
  | 'brandType'
  | 'connection';

export type PartExportFieldKey =
  | 'type'
  | 'serialNumber'
  | 'cumulativeHours'
  | 'status'
  | 'componentStatus'
  | 'currentMotor'
  | 'totalAssignments';

export type PartAvailabilityStatus = 'AVAILABLE' | 'INSTALLED';

export type MotorExportRecord = {
  id: string;
  name: string;
  serialNumber: string;
  location: string | null;
  status: string;
  pumpingHours: number;
  dateOut: string | null;
  dateIn: string | null;
  assembledParts: number;
  sapId?: string | null;
  assetType?: string | null;
  size?: string | null;
  brandType?: string | null;
  connection?: string | null;
};

export type PartExportRecord = {
  id: string;
  type: string;
  serialNumber: string;
  cumulativeHours: number;
  availabilityStatus: PartAvailabilityStatus;
  componentStatus: string;
  currentMotorId: string | null;
  currentMotorName: string | null;
  totalAssignments: number;
};

export type MotorExportFilters = {
  statuses?: string[];
  dateOutFrom?: string | null;
  dateOutTo?: string | null;
  minHours?: number | null;
};

export type PartExportFilters = {
  componentTypes?: string[];
  statuses?: PartAvailabilityStatus[];
  installedMotorId?: string | null;
};

type FieldDefinition<TRecord, TKey extends string> = {
  key: TKey;
  label: string;
  getValue: (record: TRecord) => string;
};

const MOTOR_FIELD_DEFINITIONS: Record<MotorExportFieldKey, FieldDefinition<MotorExportRecord, MotorExportFieldKey>> = {
  name: {
    key: 'name',
    label: 'Name',
    getValue: (record) => asText(record.name),
  },
  serialNumber: {
    key: 'serialNumber',
    label: 'Serial Number',
    getValue: (record) => asText(record.serialNumber),
  },
  location: {
    key: 'location',
    label: 'Location',
    getValue: (record) => record.location || '',
  },
  status: {
    key: 'status',
    label: 'Status',
    getValue: (record) => getStatusLabel(asText(record.status)),
  },
  pumpingHours: {
    key: 'pumpingHours',
    label: 'Pumping Hours',
    getValue: (record) => toFixedHour(record.pumpingHours),
  },
  dateOut: {
    key: 'dateOut',
    label: 'Date Out',
    getValue: (record) => record.dateOut || '',
  },
  dateIn: {
    key: 'dateIn',
    label: 'Date In',
    getValue: (record) => record.dateIn || '',
  },
  assembledParts: {
    key: 'assembledParts',
    label: 'Assembled Parts',
    getValue: (record) => asText(record.assembledParts),
  },
  sapId: {
    key: 'sapId',
    label: 'SAP ID',
    getValue: (record) => asText(record.sapId),
  },
  assetType: {
    key: 'assetType',
    label: 'Asset Type',
    getValue: (record) => asText(record.assetType),
  },
  size: {
    key: 'size',
    label: 'Size',
    getValue: (record) => asText(record.size),
  },
  brandType: {
    key: 'brandType',
    label: 'Brand / Type',
    getValue: (record) => asText(record.brandType),
  },
  connection: {
    key: 'connection',
    label: 'Connection',
    getValue: (record) => asText(record.connection),
  },
};

const PART_FIELD_DEFINITIONS: Record<PartExportFieldKey, FieldDefinition<PartExportRecord, PartExportFieldKey>> = {
  type: {
    key: 'type',
    label: 'Component Type',
    getValue: (record) => {
      const type = asText(record.type);
      return SUB_COMPONENT_LABELS[type] || type;
    },
  },
  serialNumber: {
    key: 'serialNumber',
    label: 'Serial Number',
    getValue: (record) => asText(record.serialNumber),
  },
  cumulativeHours: {
    key: 'cumulativeHours',
    label: 'Cumulative Hours',
    getValue: (record) => toFixedHour(record.cumulativeHours),
  },
  status: {
    key: 'status',
    label: 'Status',
    getValue: (record) => asText(record.availabilityStatus),
  },
  componentStatus: {
    key: 'componentStatus',
    label: 'Component Status',
    getValue: (record) => asText(record.componentStatus),
  },
  currentMotor: {
    key: 'currentMotor',
    label: 'Current Motor',
    getValue: (record) => asText(record.currentMotorName || 'Unassigned'),
  },
  totalAssignments: {
    key: 'totalAssignments',
    label: 'Total Assignments',
    getValue: (record) => asText(record.totalAssignments),
  },
};

export const MOTOR_FIELD_OPTIONS: Array<{ key: MotorExportFieldKey; label: string }> = Object.values(
  MOTOR_FIELD_DEFINITIONS
).map((field) => ({ key: field.key, label: field.label }));

export const PART_FIELD_OPTIONS: Array<{ key: PartExportFieldKey; label: string }> = Object.values(
  PART_FIELD_DEFINITIONS
).map((field) => ({ key: field.key, label: field.label }));

export const PART_INSTALL_STATUS_OPTIONS: PartAvailabilityStatus[] = ['AVAILABLE', 'INSTALLED'];

const DEFAULT_MOTOR_FIELDS: MotorExportFieldKey[] = MOTOR_FIELD_OPTIONS.map((field) => field.key);
const DEFAULT_PART_FIELDS: PartExportFieldKey[] = PART_FIELD_OPTIONS.map((field) => field.key);

export function toDateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export function filterMotorRecords(records: MotorExportRecord[], filters: MotorExportFilters = {}): MotorExportRecord[] {
  const statuses = sanitizeStringArray(filters.statuses);
  const from = normalizeDateInput(filters.dateOutFrom);
  const to = normalizeDateInput(filters.dateOutTo);
  const minHours =
    typeof filters.minHours === 'number' && Number.isFinite(filters.minHours) ? filters.minHours : null;

  return records.filter((record) => {
    if (statuses.length > 0 && !statuses.includes(record.status)) {
      return false;
    }

    if (from && (!record.dateOut || record.dateOut < from)) {
      return false;
    }

    if (to && (!record.dateOut || record.dateOut > to)) {
      return false;
    }

    if (minHours != null && !(record.pumpingHours > minHours)) {
      return false;
    }

    return true;
  });
}

export function filterPartRecords(records: PartExportRecord[], filters: PartExportFilters = {}): PartExportRecord[] {
  const componentTypes = sanitizeStringArray(filters.componentTypes);
  const statuses = sanitizePartStatuses(filters.statuses);
  const installedMotorId = filters.installedMotorId?.trim() || null;

  return records.filter((record) => {
    if (componentTypes.length > 0 && !componentTypes.includes(record.type)) {
      return false;
    }

    if (statuses.length > 0 && !statuses.includes(record.availabilityStatus)) {
      return false;
    }

    if (installedMotorId && record.currentMotorId !== installedMotorId) {
      return false;
    }

    return true;
  });
}

export function buildMotorTable(
  records: MotorExportRecord[],
  selectedFields?: string[]
): { headers: string[]; rows: string[][]; fields: MotorExportFieldKey[] } {
  const fields = normalizeMotorFields(selectedFields);
  const headers = fields.map((field) => MOTOR_FIELD_DEFINITIONS[field].label);
  const rows = records.map((record) =>
    fields.map((field) => MOTOR_FIELD_DEFINITIONS[field].getValue(record))
  );

  return { headers, rows, fields };
}

export function buildPartTable(
  records: PartExportRecord[],
  selectedFields?: string[]
): { headers: string[]; rows: string[][]; fields: PartExportFieldKey[] } {
  const fields = normalizePartFields(selectedFields);
  const headers = fields.map((field) => PART_FIELD_DEFINITIONS[field].label);
  const rows = records.map((record) =>
    fields.map((field) => PART_FIELD_DEFINITIONS[field].getValue(record))
  );

  return { headers, rows, fields };
}

export function normalizeMotorFields(selectedFields?: string[]): MotorExportFieldKey[] {
  return normalizeFields(selectedFields, DEFAULT_MOTOR_FIELDS);
}

export function normalizePartFields(selectedFields?: string[]): PartExportFieldKey[] {
  return normalizeFields(selectedFields, DEFAULT_PART_FIELDS);
}

export function buildCsv(
  headers: Array<string | null | undefined>,
  rows: Array<Array<string | null | undefined>>
): string {
  const allLines = [headers.map(escapeCsvValue).join(',')];

  for (const row of rows) {
    allLines.push(row.map(escapeCsvValue).join(','));
  }

  return allLines.join('\n');
}

export function escapeCsvValue(value: unknown): string {
  const normalized = asText(value);

  if (normalized.includes(',') || normalized.includes('"') || normalized.includes('\n')) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

export function describeMotorFilters(filters: MotorExportFilters): string[] {
  const descriptions: string[] = [];
  const statuses = sanitizeStringArray(filters.statuses);
  const from = normalizeDateInput(filters.dateOutFrom);
  const to = normalizeDateInput(filters.dateOutTo);
  const minHours =
    typeof filters.minHours === 'number' && Number.isFinite(filters.minHours) ? filters.minHours : null;

  if (statuses.length > 0) {
    const labels = statuses.map((status) => getStatusLabel(status));
    descriptions.push(`Status: ${labels.join(', ')}`);
  } else {
    descriptions.push('Status: All');
  }

  if (from || to) {
    descriptions.push(`Date Out Range: ${from || 'Any'} to ${to || 'Any'}`);
  } else {
    descriptions.push('Date Out Range: Any');
  }

  descriptions.push(minHours != null ? `Pumping Hours: > ${minHours}` : 'Pumping Hours: Any');

  return descriptions;
}

export function describePartFilters(
  filters: PartExportFilters,
  installedMotorNameById: Record<string, string>
): string[] {
  const descriptions: string[] = [];
  const componentTypes = sanitizeStringArray(filters.componentTypes);
  const statuses = sanitizePartStatuses(filters.statuses);
  const installedMotorId = filters.installedMotorId?.trim() || null;

  if (componentTypes.length > 0) {
    const labels = componentTypes.map((type) => SUB_COMPONENT_LABELS[type] || type);
    descriptions.push(`Component Type: ${labels.join(', ')}`);
  } else {
    descriptions.push('Component Type: All');
  }

  descriptions.push(statuses.length > 0 ? `Status: ${statuses.join(', ')}` : 'Status: All');

  if (installedMotorId) {
    const motorName = installedMotorNameById[installedMotorId] || installedMotorId;
    descriptions.push(`Installed In Motor: ${motorName}`);
  } else {
    descriptions.push('Installed In Motor: Any');
  }

  return descriptions;
}

function normalizeFields<TField extends string>(selectedFields: string[] | undefined, allFields: TField[]): TField[] {
  if (!selectedFields || selectedFields.length === 0) {
    return [...allFields];
  }

  const allowed = new Set(allFields);
  const selected = new Set(selectedFields.filter((field): field is TField => allowed.has(field as TField)));
  const normalized = allFields.filter((field) => selected.has(field));

  return normalized.length > 0 ? normalized : [...allFields];
}

function sanitizeStringArray(values?: unknown[]): string[] {
  if (!values || values.length === 0) {
    return [];
  }

  const uniqueValues = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed) {
      uniqueValues.add(trimmed);
    }
  }

  return [...uniqueValues];
}

function sanitizePartStatuses(values?: unknown[]): PartAvailabilityStatus[] {
  if (!values || values.length === 0) {
    return [];
  }

  const uniqueValues = new Set<PartAvailabilityStatus>();

  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    if (value === 'AVAILABLE' || value === 'INSTALLED') {
      uniqueValues.add(value);
    }
  }

  return [...uniqueValues];
}

function normalizeDateInput(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function asText(value: unknown): string {
  if (value == null) {
    return '';
  }

  return String(value);
}

function toFixedHour(value: unknown): string {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(1) : '0.0';
}