import { listSubComponents } from '@/actions/subcomponent.actions';
import { ASSET_STATUS_META, type AssetStatus } from '@/lib/asset-status';
import { AssetStatusBadge } from '@/components/asset-status-selector';
import { parseListParams, buildListUrl, VALID_PAGE_SIZES } from '@/lib/utils';
import { LiveSearchInput } from '@/components/LiveSearchInput';
import Link from 'next/link';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Stators — Motor Hour Tracker',
  description: 'Browse all stator sub-components by serial number, status, and pumping hours.',
};

const SORT_OPTIONS = [
  { value: 'serialNumber', label: 'Serial No.' },
  { value: 'status', label: 'Status' },
  { value: 'cumulativeHours', label: 'Pump Hours' },
  { value: 'updatedAt', label: 'Last Updated' },
] as const;

const SORT_ALLOWLIST = SORT_OPTIONS.map((o) => o.value);
const BASE = '/stators';
const CATEGORY = 'STATOR';

export default async function StatorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = parseListParams(raw, SORT_ALLOWLIST, 'serialNumber');
  const { items: stators, total } = await listSubComponents({ ...params, assetCategory: CATEGORY });

  const {
    page, pageSize, sort, dir, q, statuses,
    size, brand, configuration, hoursMin, hoursMax, motorQ,
  } = params;
  const skip = (page - 1) * pageSize;
  const totalPages = Math.ceil(total / pageSize);

  const hasFilters =
    q || statuses.length > 0 || size || brand || configuration ||
    hoursMin !== null || hoursMax !== null || motorQ;

  function sortHref(field: string) {
    const newDir = sort === field && dir === 'asc' ? 'desc' : 'asc';
    return buildListUrl(BASE, params, { sort: field, dir: newDir });
  }

  function SortTh({
    field,
    label,
    align = 'left',
  }: {
    field: string;
    label: string;
    align?: 'left' | 'right';
  }) {
    const active = sort === field;
    const indicator = active ? (dir === 'asc' ? ' ↑' : ' ↓') : ' ↕';
    return (
      <th
        className={`text-${align} px-4 py-3 text-xs font-semibold text-[#333333] uppercase tracking-wider`}
      >
        <Link
          href={sortHref(field)}
          className={`hover:text-[#9E9EB0] transition-colors ${active ? 'text-[#9E9EB0]' : ''}`}
        >
          {label}
          <span className="ml-0.5 opacity-60">{indicator}</span>
        </Link>
      </th>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-[#121212] tracking-tight">Stators</h1>
          <p className="text-sm text-[#333333] mt-1">
            {total} stator{total !== 1 ? 's' : ''} registered
          </p>
        </div>
        <Link
          href="/sub-components/new"
          className="w-full md:w-auto text-center bg-[#9E9EB0] hover:bg-[#8A8A9F] text-white font-semibold text-sm px-4 py-3 md:py-2.5 rounded-lg transition-all duration-200"
        >
          + New Component
        </Link>
      </div>

      {/* Filter bar */}
      <form method="get" action={BASE} className="space-y-2 mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row gap-2">
          <Suspense fallback={null}>
            <LiveSearchInput
              basePath="/stators"
              paramName="q"
              defaultValue={q}
              id="stators-search"
              placeholder="Search by serial number or SAP ID…"
              className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#333333] placeholder-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
            />
          </Suspense>
          <input
            type="text"
            name="size"
            id="stators-size"
            defaultValue={size}
            placeholder="Size…"
            className="w-full sm:w-28 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#333333] placeholder-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
          <input
            type="text"
            name="brand"
            id="stators-brand"
            defaultValue={brand}
            placeholder="Brand…"
            className="w-full sm:w-28 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#333333] placeholder-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
          <input
            type="text"
            name="configuration"
            id="stators-config"
            defaultValue={configuration}
            placeholder="Config…"
            className="w-full sm:w-28 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#333333] placeholder-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
          <input
            type="text"
            name="motorQ"
            id="stators-motor"
            defaultValue={motorQ}
            placeholder="Motor…"
            className="w-full sm:w-36 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#333333] placeholder-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Hours range */}
          <input
            type="number"
            name="hoursMin"
            id="stators-hours-min"
            defaultValue={hoursMin ?? ''}
            placeholder="Hrs ≥"
            min="0"
            step="0.1"
            className="w-24 bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[#333333] placeholder-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] transition-colors"
          />
          <input
            type="number"
            name="hoursMax"
            id="stators-hours-max"
            defaultValue={hoursMax ?? ''}
            placeholder="Hrs ≤"
            min="0"
            step="0.1"
            className="w-24 bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[#333333] placeholder-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] transition-colors"
          />

          {/* Status badges */}
          {(Object.keys(ASSET_STATUS_META) as AssetStatus[]).map((s) => {
            const meta = ASSET_STATUS_META[s];
            const active = statuses.includes(s);
            return (
              <label
                key={s}
                className="flex items-center cursor-pointer select-none"
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
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border transition-all ${active ? 'opacity-100 ring-2 ring-offset-1' : 'opacity-50 hover:opacity-80'}`}
                  style={{ background: meta.color, color: meta.textColor, borderColor: meta.color }}
                >
                  {meta.code}
                </span>
              </label>
            );
          })}

          {/* Sort + dir */}
          <select
            name="sort"
            id="stators-sort"
            defaultValue={sort}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[#333333] focus:outline-none focus:border-[#9E9EB0] transition-colors"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>Sort: {o.label}</option>
            ))}
          </select>
          <select
            name="dir"
            id="stators-dir"
            defaultValue={dir}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[#333333] focus:outline-none focus:border-[#9E9EB0] transition-colors"
          >
            <option value="asc">↑ Asc</option>
            <option value="desc">↓ Desc</option>
          </select>

          {/* Page size */}
          <select
            name="pageSize"
            id="stators-page-size"
            defaultValue={String(pageSize)}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[#333333] focus:outline-none focus:border-[#9E9EB0] transition-colors"
          >
            {VALID_PAGE_SIZES.map((n) => (
              <option key={n} value={String(n)}>{n} per page</option>
            ))}
          </select>

          <input type="hidden" name="page" value="1" />
          <button
            type="submit"
            id="stators-search-btn"
            className="bg-[#9E9EB0] hover:bg-[#8A8A9F] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
          >
            Apply
          </button>
          {hasFilters && (
            <Link
              href={BASE}
              className="text-xs text-[#9E9EB0] hover:text-[#333333] px-1 py-1.5 transition-colors"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {/* Table */}
      {stators.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)] animate-fade-in">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--card)] border-b border-[var(--border)]">
                  <SortTh field="serialNumber" label="Serial No." />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#333333] uppercase tracking-wider">
                    SAP ID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#333333] uppercase tracking-wider">
                    Size
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#333333] uppercase tracking-wider">
                    Brand / Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#333333] uppercase tracking-wider">
                    Configuration
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#333333] uppercase tracking-wider">
                    Location
                  </th>
                  <SortTh field="cumulativeHours" label="Pump Hrs" align="right" />
                  <SortTh field="status" label="Status" />
                </tr>
              </thead>
              <tbody>
                {stators.map((sc, i) => {
                  const currentMotor = sc.assemblies[0]?.motor ?? null;
                  return (
                    <tr
                      key={sc.id}
                      className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--card)] transition-colors animate-fade-in stagger-${Math.min(i + 1, 6)}`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/sub-components/${sc.id}`}
                          className="font-mono font-medium text-[#121212] hover:text-[#9E9EB0] transition-colors"
                        >
                          {sc.serialNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-[#333333]">
                        {sc.sapId ?? <span className="text-[#A3A3A3]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[#333333]">
                        {sc.size ?? <span className="text-[#A3A3A3]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[#333333]">
                        {sc.brand ?? <span className="text-[#A3A3A3]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[#333333]">
                        {sc.configuration ?? <span className="text-[#A3A3A3]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[#333333]">
                        {currentMotor ? (
                          <Link
                            href={`/motors/${currentMotor.id}`}
                            className="text-[#9E9EB0] hover:text-[#333333] transition-colors"
                          >
                            {currentMotor.location ?? currentMotor.name}
                          </Link>
                        ) : (
                          <span className="text-[#A3A3A3]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-[#121212]">
                        {sc.cumulativeHours.toFixed(1)}
                      </td>
                      <td className="px-4 py-3">
                        <AssetStatusBadge status={sc.status as AssetStatus} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-3 text-sm animate-fade-in">
            <p className="text-[#333333]">
              Showing {total === 0 ? 0 : skip + 1}–{Math.min(skip + pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={buildListUrl(BASE, params, { page: String(page - 1) })}
                  className="px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[#9E9EB0]/50 transition-colors"
                >
                  ← Prev
                </Link>
              )}
              <span className="px-3 py-1.5 text-[#333333]">{page} / {totalPages || 1}</span>
              {page < totalPages && (
                <Link
                  href={buildListUrl(BASE, params, { page: String(page + 1) })}
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
          <div className="text-4xl mb-4 opacity-30">◎</div>
          <p className="text-[#333333] text-sm mb-2">
            {hasFilters ? 'No stators match your filters.' : 'No stators registered.'}
          </p>
          {hasFilters && (
            <Link
              href={BASE}
              className="inline-block mt-2 text-[#9E9EB0] hover:text-[#333333] text-sm transition-colors"
            >
              Clear filters
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
