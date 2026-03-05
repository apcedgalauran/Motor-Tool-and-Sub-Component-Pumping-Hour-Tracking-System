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

export const MOTOR_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  IN_MAINTENANCE: 'In Maintenance',
};

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
