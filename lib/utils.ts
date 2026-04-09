export const SUB_COMPONENT_LABELS: Record<string, string> = {
  STATOR_ADAPTER: 'Stator Adapter',
  SPLINE_MANDREL: 'Spline Mandrel',
  ADJUSTING_RING: 'Adjusting Ring',
  OFFSET_HOUSING: 'Offset Housing',
  ROTOR_COUPLING: 'Rotor Coupling',
  TRANS_SHAFT: 'Transmission Shaft',
  SHAFT_COUPLING: 'Shaft Coupling',
  ROTOR: 'Rotor',
  STATOR: 'Stator',
  SLEEVE: 'Sleeve',
  FLOAT_SUB: 'Float Sub',
  LIFT_SUB: 'Lift Sub',
};

/* ── Standard Motor Statuses ── */

export const STANDARD_MOTOR_STATUSES = ['ON_LOCATION', 'IN_BASE', 'FOR_MAINTENANCE'] as const;
export type StandardMotorStatus = (typeof STANDARD_MOTOR_STATUSES)[number];

export const MOTOR_STATUS_LABELS: Record<string, string> = {
  ON_LOCATION: 'On Location',
  IN_BASE: 'In Base',
  FOR_MAINTENANCE: 'For Maintenance',
};

export const MOTOR_STATUS_COLORS: Record<string, string> = {
  ON_LOCATION: '#10b981',     // green
  IN_BASE: '#3b82f6',         // blue
  FOR_MAINTENANCE: '#f59e0b', // amber
};

/** Palette for auto-assigning colors to permanent custom statuses */
export const CUSTOM_STATUS_PALETTE = [
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#06b6d4', '#e11d48', '#a855f7', '#22d3ee',
];

/* ── Helpers ── */

export function getStatusColor(status: string, customColor?: string | null): string {
  return MOTOR_STATUS_COLORS[status] || customColor || '#9E9EB0';
}

export function getStatusLabel(status: string): string {
  return MOTOR_STATUS_LABELS[status] || status;
}

export function formatHours(hours: number): string {
  return hours.toFixed(1);
}

export function formatDate(date: Date | string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
