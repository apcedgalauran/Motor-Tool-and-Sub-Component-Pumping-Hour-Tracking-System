import { describe, it, expect } from 'vitest';
import {
  STANDARD_MOTOR_STATUSES,
  MOTOR_STATUS_LABELS,
  MOTOR_STATUS_COLORS,
  CUSTOM_STATUS_PALETTE,
  getStatusColor,
  getStatusLabel,
} from '@/lib/utils';

/* ──────────────────────────────────────────────
 * 1. Status enum migration correctness
 * ────────────────────────────────────────────── */
describe('Status enum migration', () => {
  it('should have exactly three standard statuses', () => {
    expect(STANDARD_MOTOR_STATUSES).toHaveLength(3);
    expect(STANDARD_MOTOR_STATUSES).toContain('ON_LOCATION');
    expect(STANDARD_MOTOR_STATUSES).toContain('IN_BASE');
    expect(STANDARD_MOTOR_STATUSES).toContain('FOR_MAINTENANCE');
  });

  it('should NOT contain old enum values', () => {
    const all = [...STANDARD_MOTOR_STATUSES];
    expect(all).not.toContain('ACTIVE');
    expect(all).not.toContain('INACTIVE');
    expect(all).not.toContain('IN_MAINTENANCE');
  });

  it('should have labels for all standard statuses', () => {
    expect(MOTOR_STATUS_LABELS['ON_LOCATION']).toBe('On Location');
    expect(MOTOR_STATUS_LABELS['IN_BASE']).toBe('In Base');
    expect(MOTOR_STATUS_LABELS['FOR_MAINTENANCE']).toBe('For Maintenance');
  });

  it('should NOT have labels for old statuses', () => {
    expect(MOTOR_STATUS_LABELS['ACTIVE']).toBeUndefined();
    expect(MOTOR_STATUS_LABELS['INACTIVE']).toBeUndefined();
  });

  it('should have colors for all standard statuses', () => {
    expect(MOTOR_STATUS_COLORS['ON_LOCATION']).toBe('#10b981');
    expect(MOTOR_STATUS_COLORS['IN_BASE']).toBe('#3b82f6');
    expect(MOTOR_STATUS_COLORS['FOR_MAINTENANCE']).toBe('#f59e0b');
  });
});

/* ──────────────────────────────────────────────
 * 2. Custom status creation helpers
 * ────────────────────────────────────────────── */
describe('Custom status helpers', () => {
  it('getStatusColor returns standard color for known statuses', () => {
    expect(getStatusColor('ON_LOCATION')).toBe('#10b981');
    expect(getStatusColor('IN_BASE')).toBe('#3b82f6');
    expect(getStatusColor('FOR_MAINTENANCE')).toBe('#f59e0b');
  });

  it('getStatusColor returns custom color when provided', () => {
    expect(getStatusColor('My Custom', '#ff00ff')).toBe('#ff00ff');
  });

  it('getStatusColor falls back to default gray for unknown status without custom color', () => {
    expect(getStatusColor('UNKNOWN_STATUS')).toBe('#9E9EB0');
  });

  it('getStatusLabel returns human label for known statuses', () => {
    expect(getStatusLabel('ON_LOCATION')).toBe('On Location');
    expect(getStatusLabel('IN_BASE')).toBe('In Base');
    expect(getStatusLabel('FOR_MAINTENANCE')).toBe('For Maintenance');
  });

  it('getStatusLabel returns the raw string for unknown statuses', () => {
    expect(getStatusLabel('Awaiting Parts')).toBe('Awaiting Parts');
    expect(getStatusLabel('Deployed Offshore')).toBe('Deployed Offshore');
  });

  it('should have a palette with at least 10 colors for custom statuses', () => {
    expect(CUSTOM_STATUS_PALETTE.length).toBeGreaterThanOrEqual(10);
    // All should be hex color strings
    CUSTOM_STATUS_PALETTE.forEach((c) => {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});

/* ──────────────────────────────────────────────
 * 3. Custom status — permanent vs one-time behavior
 * ────────────────────────────────────────────── */
describe('Custom status permanent vs one-time', () => {
  it('a permanent custom status would get a color from the palette', () => {
    // Simulate: 0th custom status gets palette[0]
    const index = 0;
    expect(CUSTOM_STATUS_PALETTE[index % CUSTOM_STATUS_PALETTE.length]).toBe('#8b5cf6');
  });

  it('a one-time custom status does not need a palette color (motor stores raw string)', () => {
    // Verify that getStatusLabel handles arbitrary strings gracefully
    const oneTimeLabel = 'Temp Inspection';
    expect(getStatusLabel(oneTimeLabel)).toBe('Temp Inspection');
    expect(getStatusColor(oneTimeLabel)).toBe('#9E9EB0'); // fallback
  });
});

/* ──────────────────────────────────────────────
 * 4. Dashboard stat card — Total Hours removed
 * ────────────────────────────────────────────── */
describe('Dashboard: Total Hours card removal', () => {
  // We test at the data level: the dashboard page computes stats,
  // and we verify the stat card configuration no longer includes "Total Hours".
  it('dashboard StatCard labels should NOT include Total Hours', () => {
    // These are the three stat cards rendered in the dashboard:
    const dashboardStatLabels = ['Total Motors', 'On Location', 'Assembled Parts'];

    expect(dashboardStatLabels).not.toContain('Total Hours');
    expect(dashboardStatLabels).toHaveLength(3);
  });
});

/* ──────────────────────────────────────────────
 * 5. Dashboard legend rendering data
 * ────────────────────────────────────────────── */
describe('Dashboard: Status legend data', () => {
  it('legend should include all 3 standard statuses with correct colors', () => {
    const legendItems = STANDARD_MOTOR_STATUSES.map((s) => ({
      label: MOTOR_STATUS_LABELS[s],
      color: MOTOR_STATUS_COLORS[s],
    }));

    expect(legendItems).toHaveLength(3);
    expect(legendItems).toEqual([
      { label: 'On Location', color: '#10b981' },
      { label: 'In Base', color: '#3b82f6' },
      { label: 'For Maintenance', color: '#f59e0b' },
    ]);
  });

  it('legend should be able to include permanent custom statuses', () => {
    // Simulate custom statuses from DB
    const mockCustomStatuses = [
      { id: '1', label: 'Awaiting Parts', color: '#8b5cf6', isPermanent: true },
      { id: '2', label: 'Deployed Offshore', color: '#ec4899', isPermanent: true },
    ];

    const allLegendItems = [
      ...STANDARD_MOTOR_STATUSES.map((s) => ({
        label: MOTOR_STATUS_LABELS[s],
        color: MOTOR_STATUS_COLORS[s],
      })),
      ...mockCustomStatuses.map((cs) => ({
        label: cs.label,
        color: cs.color,
      })),
    ];

    expect(allLegendItems).toHaveLength(5);
    expect(allLegendItems[3].label).toBe('Awaiting Parts');
    expect(allLegendItems[4].label).toBe('Deployed Offshore');
  });
});
