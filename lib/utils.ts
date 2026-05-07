import { ASSET_STATUS_META, type AssetStatus } from '@/lib/asset-status';

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

/* ── Standard Motor Statuses (Legacy — kept for backward compat) ── */

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
  if (status in ASSET_STATUS_META) {
    return ASSET_STATUS_META[status as AssetStatus].color;
  }
  return MOTOR_STATUS_COLORS[status] || customColor || '#9E9EB0';
}

export function getStatusLabel(status: string): string {
  if (status in ASSET_STATUS_META) {
    return ASSET_STATUS_META[status as AssetStatus].label;
  }
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

// ─────────────────────────────────────────────────────────────────────────────
// Server-side list-page utilities (pagination, sorting, filters)
// ─────────────────────────────────────────────────────────────────────────────

/** Detect whether the app is running against a SQLite database.
 *  Used to conditionally omit `mode: 'insensitive'` from Prisma queries.
 */
export function isSqliteDb(): boolean {
  return (
    process.env.DATABASE_URL?.startsWith('file:') === true ||
    process.env.DATABASE_URL?.includes('sqlite') === true
  );
}

export const VALID_PAGE_SIZES = [10, 20, 50] as const;
export type PageSize = (typeof VALID_PAGE_SIZES)[number];

export interface ListParams {
  q: string;
  statuses: AssetStatus[];
  page: number;
  pageSize: PageSize;
  sort: string;
  dir: 'asc' | 'desc';
  // motor / sub-component extras
  location: string;
  size: string;
  brand: string;
  type: string;
  configuration: string;
  hoursMin: number | null;
  hoursMax: number | null;
  installed: 'yes' | 'no' | '';
  motorQ: string;
}

/**
 * Parse raw Next.js `searchParams` into a validated `ListParams` object.
 *
 * @param raw            The resolved searchParams object from a Next.js page.
 * @param sortAllowlist  Field names accepted for `sort`; defaults to [].
 * @param defaultSort    The default sort field if `raw.sort` is absent or invalid.
 */
export function parseListParams(
  raw: Record<string, string | string[] | undefined>,
  sortAllowlist: string[] = [],
  defaultSort = 'serialNumber',
): ListParams {
  // --- text search ---
  const q = typeof raw.q === 'string' ? raw.q.trim() : '';

  // --- statuses: support `statuses[]=X&statuses[]=Y` and legacy `status=X` ---
  const validStatusKeys = new Set(Object.keys(ASSET_STATUS_META));
  const rawStatuses: string[] = [];
  if (Array.isArray(raw['statuses[]'])) {
    rawStatuses.push(...(raw['statuses[]'] as string[]));
  } else if (typeof raw['statuses[]'] === 'string') {
    rawStatuses.push(raw['statuses[]'] as string);
  }
  // Also check plain `statuses` key
  if (Array.isArray(raw.statuses)) {
    rawStatuses.push(...raw.statuses);
  } else if (typeof raw.statuses === 'string') {
    rawStatuses.push(raw.statuses);
  }
  // Legacy single `status` param
  if (typeof raw.status === 'string' && raw.status) {
    rawStatuses.push(raw.status);
  }
  const statuses = [...new Set(rawStatuses)].filter((s) =>
    validStatusKeys.has(s),
  ) as AssetStatus[];

  // --- pagination ---
  const page = Math.max(1, parseInt(typeof raw.page === 'string' ? raw.page : '1', 10) || 1);
  const rawPageSize = parseInt(typeof raw.pageSize === 'string' ? raw.pageSize : '20', 10);
  const pageSize: PageSize = (VALID_PAGE_SIZES as readonly number[]).includes(rawPageSize)
    ? (rawPageSize as PageSize)
    : 20;

  // --- sort ---
  const rawSort = typeof raw.sort === 'string' ? raw.sort : '';
  const sort = sortAllowlist.includes(rawSort) ? rawSort : defaultSort;
  const dir: 'asc' | 'desc' =
    typeof raw.dir === 'string' && raw.dir === 'desc' ? 'desc' : 'asc';

  // --- extra filters ---
  const location = typeof raw.location === 'string' ? raw.location.trim() : '';
  const size = typeof raw.size === 'string' ? raw.size.trim() : '';
  const brand = typeof raw.brand === 'string' ? raw.brand.trim() : '';
  const type = typeof raw.type === 'string' ? raw.type.trim() : '';
  const configuration =
    typeof raw.configuration === 'string' ? raw.configuration.trim() : '';
  const hoursMinRaw = typeof raw.hoursMin === 'string' ? parseFloat(raw.hoursMin) : NaN;
  const hoursMaxRaw = typeof raw.hoursMax === 'string' ? parseFloat(raw.hoursMax) : NaN;
  const hoursMin = isNaN(hoursMinRaw) ? null : hoursMinRaw;
  const hoursMax = isNaN(hoursMaxRaw) ? null : hoursMaxRaw;
  const rawInstalled = typeof raw.installed === 'string' ? raw.installed : '';
  const installed: 'yes' | 'no' | '' =
    rawInstalled === 'yes' ? 'yes' : rawInstalled === 'no' ? 'no' : '';
  const motorQ = typeof raw.motorQ === 'string' ? raw.motorQ.trim() : '';

  return {
    q,
    statuses,
    page,
    pageSize,
    sort,
    dir,
    location,
    size,
    brand,
    type,
    configuration,
    hoursMin,
    hoursMax,
    installed,
    motorQ,
  };
}

/** Filter/sort keys whose change should reset `page` to 1. */
const FILTER_SORT_KEYS = [
  'q', 'statuses', 'sort', 'dir', 'location', 'size', 'brand',
  'type', 'configuration', 'hoursMin', 'hoursMax', 'installed', 'motorQ',
] as const;

/**
 * Build a list-page URL by merging current params with overrides.
 * If any filter/sort key changes, `page` is automatically reset to 1.
 *
 * @param base      Base path, e.g. `/stators`.
 * @param current   Current `ListParams`.
 * @param overrides Partial record of string overrides to apply.
 */
export function buildListUrl(
  base: string,
  current: ListParams,
  overrides: Partial<Record<string, string>>,
): string {
  // Detect if any filter/sort key is changing
  const filterChanged = FILTER_SORT_KEYS.some((key) => key in overrides);

  const p = new URLSearchParams();

  // Helper: set only if non-empty
  const maybeSet = (k: string, v: string | number | null | undefined) => {
    if (v !== null && v !== undefined && String(v) !== '') p.set(k, String(v));
  };

  const merged = { ...overrides };

  maybeSet('q', merged.q ?? current.q);
  const statuses = current.statuses; // statuses are not overridden via this helper
  statuses.forEach((s) => p.append('statuses[]', s));
  maybeSet('page', filterChanged ? '1' : String(merged.page ?? current.page));
  if ((merged.pageSize ? Number(merged.pageSize) : current.pageSize) !== 20) {
    maybeSet('pageSize', merged.pageSize ?? String(current.pageSize));
  }
  const sortVal = merged.sort ?? current.sort;
  if (sortVal && sortVal !== 'serialNumber') maybeSet('sort', sortVal);
  const dirVal = merged.dir ?? current.dir;
  if (dirVal === 'desc') maybeSet('dir', 'desc');
  maybeSet('location', merged.location ?? current.location);
  maybeSet('size', merged.size ?? current.size);
  maybeSet('brand', merged.brand ?? current.brand);
  maybeSet('type', merged.type ?? current.type);
  maybeSet('configuration', merged.configuration ?? current.configuration);
  if ((merged.hoursMin ?? (current.hoursMin !== null ? String(current.hoursMin) : '')) !== '') {
    maybeSet('hoursMin', merged.hoursMin ?? String(current.hoursMin));
  }
  if ((merged.hoursMax ?? (current.hoursMax !== null ? String(current.hoursMax) : '')) !== '') {
    maybeSet('hoursMax', merged.hoursMax ?? String(current.hoursMax));
  }
  maybeSet('installed', merged.installed ?? current.installed);
  maybeSet('motorQ', merged.motorQ ?? current.motorQ);

  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}
