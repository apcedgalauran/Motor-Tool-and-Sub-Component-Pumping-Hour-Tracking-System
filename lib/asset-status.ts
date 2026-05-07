/**
 * lib/asset-status.ts
 *
 * Client-side constants and helpers for the AssetStatus taxonomy (PRD §4.3).
 * This file is NOT backed by a database — all values are static and used
 * exclusively for rendering and import/export mapping.
 *
 * Source of truth: STATUS LEGEND sheet of PROJECT_TRACKER-1.xlsx and PRD §4.3.
 */

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

export type AssetStatus =
  | 'ON_JOB'
  | 'IN_SERVICE'
  | 'RFF'
  | 'WOP'
  | 'USED'
  | 'THIRD_PARTY'
  | 'LOST_IN_HOLE'
  | 'SCRAP'
  | 'TRANSFER'
  | 'IDLE'
  | 'QUARANTINE';

// ---------------------------------------------------------------------------
// Display meta
// ---------------------------------------------------------------------------

export interface AssetStatusMeta {
  /** Single-character code used in the Excel tracker and badge labels */
  code: string;
  /** Human-readable display name */
  label: string;
  /** Hex background colour for the status badge */
  color: string;
  /** Hex foreground/text colour for the status badge */
  textColor: string;
}

export const ASSET_STATUS_META: Record<AssetStatus, AssetStatusMeta> = {
  ON_JOB:       { code: 'F', label: 'On Job',          color: '#2563eb', textColor: '#ffffff' },
  IN_SERVICE:   { code: 'S', label: 'In Service',       color: '#f59e0b', textColor: '#000000' },
  RFF:          { code: 'R', label: 'RFF',              color: '#16a34a', textColor: '#ffffff' },
  WOP:          { code: 'W', label: 'WOP',              color: '#9333ea', textColor: '#ffffff' },
  USED:         { code: 'U', label: 'Used',             color: '#dc2626', textColor: '#ffffff' },
  THIRD_PARTY:  { code: '3', label: '3rd Party Repair', color: '#0d9488', textColor: '#ffffff' },
  LOST_IN_HOLE: { code: 'L', label: 'Lost in Hole',    color: '#1f2937', textColor: '#ffffff' },
  SCRAP:        { code: 'X', label: 'Scrap',            color: '#374151', textColor: '#ffffff' },
  TRANSFER:     { code: 'T', label: 'Transfer',         color: '#c026d3', textColor: '#ffffff' },
  IDLE:         { code: 'I', label: 'Idle',             color: '#ca8a04', textColor: '#000000' },
  QUARANTINE:   { code: 'Q', label: 'Quarantine',       color: '#7c3aed', textColor: '#ffffff' },
};

// ---------------------------------------------------------------------------
// Helper: get meta for a status value
// ---------------------------------------------------------------------------

export function getStatusMeta(status: AssetStatus): AssetStatusMeta {
  return ASSET_STATUS_META[status];
}

// ---------------------------------------------------------------------------
// Terminal / restricted statuses (PRD §4.3, §10.8)
// These statuses block assembly and (for LOST_IN_HOLE / SCRAP) hour logging.
// ---------------------------------------------------------------------------

export const TERMINAL_STATUSES: AssetStatus[] = [
  'LOST_IN_HOLE',
  'SCRAP',
  'QUARANTINE',
];

export function isTerminalStatus(status: AssetStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

// ---------------------------------------------------------------------------
// Import mapping (PRD §13.4)
// Maps raw Excel "Status" column values → AssetStatus enum values.
// Unknown values should fall back to 'IDLE' at call-site with a warning.
// ---------------------------------------------------------------------------

export const IMPORT_STATUS_MAP: Record<string, AssetStatus> = {
  // Primary codes (single-letter)
  'F': 'ON_JOB',
  'S': 'IN_SERVICE',
  'R': 'RFF',
  'W': 'WOP',
  'U': 'USED',
  '3': 'THIRD_PARTY',
  'L': 'LOST_IN_HOLE',
  'X': 'SCRAP',
  'T': 'TRANSFER',
  'I': 'IDLE',
  'Q': 'QUARANTINE',

  // Full display names from the Excel Status column
  'On Job':           'ON_JOB',
  'In Service':       'IN_SERVICE',
  'RFF':              'RFF',
  'Ready For Field':  'RFF',
  'WOP':              'WOP',
  'Waiting on Parts': 'WOP',
  'Used':             'USED',
  '3rd Party':        'THIRD_PARTY',
  '3rd Party Repair': 'THIRD_PARTY',
  'Lost in Hole':     'LOST_IN_HOLE',
  'Scrap':            'SCRAP',
  'Transfer':         'TRANSFER',
  'Idle':             'IDLE',
  'Quarantine':       'QUARANTINE',

  // Legacy values from old Motor status enum
  'ON_LOCATION':    'ON_JOB',
  'IN_BASE':        'IDLE',
  'FOR_MAINTENANCE':'IN_SERVICE',

  // Legacy values from old SubComponent status free-text field
  'ACTIVE':         'IDLE',
  'IN_MAINTENANCE': 'IN_SERVICE',
  'RETIRED':        'SCRAP',
};
