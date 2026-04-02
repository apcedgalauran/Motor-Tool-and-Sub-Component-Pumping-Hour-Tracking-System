export const EDITABLE_SUB_COMPONENT_STATUSES = [
  'ACTIVE',
  'IN_MAINTENANCE',
  'RETIRED',
] as const;

export type EditableSubComponentStatus = (typeof EDITABLE_SUB_COMPONENT_STATUSES)[number];

export const EDITABLE_SUB_COMPONENT_STATUS_LABELS: Record<EditableSubComponentStatus, string> = {
  ACTIVE: 'Active',
  IN_MAINTENANCE: 'In Maintenance',
  RETIRED: 'Retired',
};

export function normalizeEditableSubComponentStatus(value: string): EditableSubComponentStatus {
  if (value === 'ACTIVE' || value === 'IN_MAINTENANCE' || value === 'RETIRED') {
    return value;
  }

  if (value === 'AVAILABLE' || value === 'INSTALLED') {
    return 'ACTIVE';
  }

  throw new Error('Status must be Active, In Maintenance, or Retired.');
}

export function toEditableSubComponentStatus(value: string): EditableSubComponentStatus {
  try {
    return normalizeEditableSubComponentStatus(value);
  } catch {
    return 'ACTIVE';
  }
}