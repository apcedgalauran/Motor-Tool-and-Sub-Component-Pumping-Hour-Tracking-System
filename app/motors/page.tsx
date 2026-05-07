import { listMotors } from '@/actions/motor.actions';
import { MotorsBrowseView } from '@/components/MotorsBrowseView';
import { ASSET_STATUS_META, type AssetStatus } from '@/lib/asset-status';
import { parseListParams, buildListUrl, VALID_PAGE_SIZES } from '@/lib/utils';
import { LiveSearchInput } from '@/components/LiveSearchInput';
import Link from 'next/link';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Motors — Motor Hour Tracker',
  description: 'Browse all motors by serial number, status, location, and hours.',
};

const SORT_OPTIONS = [
  { value: 'updatedAt', label: 'Last Updated' },
  { value: 'serialNumber', label: 'Serial Number' },
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Status' },
  { value: 'pumpingHours', label: 'Pump Hours' },
  { value: 'location', label: 'Location' },
] as const;

const MOTOR_SORT_ALLOWLIST = SORT_OPTIONS.map((o) => o.value);

export default async function MotorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = parseListParams(raw, MOTOR_SORT_ALLOWLIST, 'updatedAt');
  const { items: motors, total } = await listMotors(params);

  const { page, pageSize, sort, dir, q, statuses, location, size, brand } = params;
  const skip = (page - 1) * pageSize;
  const totalPages = Math.ceil(total / pageSize);
  const base = '/motors';

  const hasFilters = q || statuses.length > 0 || location || size || brand;

  function sortHref(field: string) {
    const newDir = sort === field && dir === 'asc' ? 'desc' : 'asc';
    return buildListUrl(base, params, { sort: field, dir: newDir });
  }

  function sortIndicator(field: string) {
    if (sort !== field) return ' ↕';
    return dir === 'asc' ? ' ↑' : ' ↓';
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-[#121212] tracking-tight">Motors</h1>
          <p className="text-sm text-[#333333] mt-1">
            {total} motor{total !== 1 ? 's' : ''} registered
          </p>
        </div>
        <Link
          href="/motors/new"
          className="w-full md:w-auto text-center bg-[#9E9EB0] hover:bg-[#8A8A9F] text-white font-semibold text-sm px-4 py-3 md:py-2.5 rounded-lg transition-all duration-200"
        >
          + New Motor
        </Link>
      </div>

      {/* Filter bar */}
      <form method="get" action={base} className="space-y-2 mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row gap-2">
          <Suspense fallback={null}>
            <LiveSearchInput
              basePath="/motors"
              paramName="q"
              defaultValue={q}
              id="motors-search"
              placeholder="Search by serial number, name, or SAP ID…"
              className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#333333] placeholder-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
            />
          </Suspense>
          <input
            type="text"
            name="location"
            id="motors-location"
            defaultValue={location}
            placeholder="Location…"
            className="w-full sm:w-36 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#333333] placeholder-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
          <input
            type="text"
            name="size"
            id="motors-size"
            defaultValue={size}
            placeholder="Size…"
            className="w-full sm:w-28 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#333333] placeholder-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
          <input
            type="text"
            name="brand"
            id="motors-brand"
            defaultValue={brand}
            placeholder="Brand…"
            className="w-full sm:w-28 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#333333] placeholder-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Status multi-select */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ASSET_STATUS_META) as AssetStatus[]).map((s) => {
              const meta = ASSET_STATUS_META[s];
              const active = statuses.includes(s);
              return (
                <label
                  key={s}
                  className="flex items-center gap-1 cursor-pointer select-none"
                  title={meta.label}
                >
                  <input
                    type="checkbox"
                    name="statuses[]"
                    value={s}
                    defaultChecked={active}
                    className="sr-only"
                  />
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border transition-all ${
                      active
                        ? 'opacity-100 ring-2 ring-offset-1'
                        : 'opacity-50 hover:opacity-80'
                    }`}
                    style={{
                      background: meta.color,
                      color: meta.textColor,
                      borderColor: meta.color,
                    }}
                  >
                    {meta.code}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Sort */}
          <select
            name="sort"
            id="motors-sort"
            defaultValue={sort}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[#333333] focus:outline-none focus:border-[#9E9EB0] transition-colors"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Sort: {o.label}
              </option>
            ))}
          </select>
          <select
            name="dir"
            id="motors-dir"
            defaultValue={dir}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[#333333] focus:outline-none focus:border-[#9E9EB0] transition-colors"
          >
            <option value="asc">↑ Asc</option>
            <option value="desc">↓ Desc</option>
          </select>

          {/* Page size */}
          <select
            name="pageSize"
            id="motors-page-size"
            defaultValue={String(pageSize)}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[#333333] focus:outline-none focus:border-[#9E9EB0] transition-colors"
          >
            {VALID_PAGE_SIZES.map((n) => (
              <option key={n} value={String(n)}>
                {n} per page
              </option>
            ))}
          </select>

          <input type="hidden" name="page" value="1" />

          <button
            type="submit"
            id="motors-search-btn"
            className="bg-[#9E9EB0] hover:bg-[#8A8A9F] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
          >
            Apply
          </button>
          {hasFilters && (
            <Link
              href={base}
              className="text-xs text-[#9E9EB0] hover:text-[#333333] px-1 py-1.5 transition-colors"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {/* Results */}
      {motors.length > 0 ? (
        <>
          {/* Sort links for quick column-level toggling (above grid) */}
          <div className="flex flex-wrap gap-2 mb-4 text-xs text-[#A3A3A3]">
            <span className="text-[#333333]">Sort by:</span>
            {SORT_OPTIONS.map((o) => (
              <Link
                key={o.value}
                href={sortHref(o.value)}
                className={`hover:text-[#333333] transition-colors ${sort === o.value ? 'text-[#9E9EB0] font-semibold' : ''}`}
              >
                {o.label}{sortIndicator(o.value)}
              </Link>
            ))}
          </div>

          <MotorsBrowseView motors={motors} />

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 gap-3 text-sm animate-fade-in">
            <p className="text-[#333333]">
              Showing {total === 0 ? 0 : skip + 1}–{Math.min(skip + pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={buildListUrl(base, params, { page: String(page - 1) })}
                  className="px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[#9E9EB0]/50 transition-colors"
                >
                  ← Prev
                </Link>
              )}
              <span className="px-3 py-1.5 text-[#333333]">
                {page} / {totalPages || 1}
              </span>
              {page < totalPages && (
                <Link
                  href={buildListUrl(base, params, { page: String(page + 1) })}
                  className="px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[#9E9EB0]/50 transition-colors"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 animate-fade-in">
          <div className="text-4xl mb-4 opacity-30">⚙</div>
          <p className="text-[#333333] text-sm mb-4">
            {hasFilters ? 'No motors match your filters.' : 'No motors registered.'}
          </p>
          {hasFilters ? (
            <Link
              href={base}
              className="inline-block bg-[#9E9EB0]/10 text-[#9E9EB0] border border-[#9E9EB0]/30 text-sm px-4 py-2 rounded-lg hover:bg-[#9E9EB0]/20 transition-colors"
            >
              Clear filters
            </Link>
          ) : (
            <Link
              href="/motors/new"
              className="inline-block bg-[#9E9EB0]/10 text-[#9E9EB0] border border-[#9E9EB0]/30 text-sm px-4 py-2 rounded-lg hover:bg-[#9E9EB0]/20 transition-colors"
            >
              Add your first motor
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
