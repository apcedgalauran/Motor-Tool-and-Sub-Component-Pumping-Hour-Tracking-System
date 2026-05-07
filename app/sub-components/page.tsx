import { listSubComponents } from '@/actions/subcomponent.actions';
import { SubComponentsBrowseView } from '@/components/SubComponentsBrowseView';
import { ASSET_STATUS_META, type AssetStatus } from '@/lib/asset-status';
import { parseListParams, buildListUrl, VALID_PAGE_SIZES } from '@/lib/utils';
import { LiveSearchInput } from '@/components/LiveSearchInput';
import Link from 'next/link';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Other Parts — Motor Hour Tracker',
  description: 'Browse all sub-components by serial number, type, status, and hours.',
};

const SORT_OPTIONS = [
  { value: 'serialNumber', label: 'Serial No.' },
  { value: 'type', label: 'Type' },
  { value: 'status', label: 'Status' },
  { value: 'cumulativeHours', label: 'Pump Hours' },
  { value: 'updatedAt', label: 'Last Updated' },
] as const;

const SC_SORT_ALLOWLIST = SORT_OPTIONS.map((o) => o.value);

export default async function SubComponentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = parseListParams(raw, SC_SORT_ALLOWLIST, 'serialNumber');
  const { items: subComponents, total } = await listSubComponents(params);

  const {
    page, pageSize, sort, dir, q, statuses,
    size, brand, configuration, hoursMin, hoursMax, installed, motorQ,
  } = params;
  const skip = (page - 1) * pageSize;
  const totalPages = Math.ceil(total / pageSize);
  const base = '/sub-components';

  const hasFilters =
    q || statuses.length > 0 || size || brand || configuration ||
    hoursMin !== null || hoursMax !== null || installed || motorQ;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-[#121212] tracking-tight">Other Parts</h1>
          <p className="text-sm text-[#333333] mt-1">
            {total} component{total !== 1 ? 's' : ''} registered
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
      <form method="get" action={base} className="space-y-2 mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row gap-2">
          <Suspense fallback={null}>
            <LiveSearchInput
              basePath="/sub-components"
              paramName="q"
              defaultValue={q}
              id="sc-search"
              placeholder="Search by serial number, type, or SAP ID…"
              className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#333333] placeholder-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
            />
          </Suspense>
          <input
            type="text"
            name="motorQ"
            id="sc-motor"
            defaultValue={motorQ}
            placeholder="Installed in motor…"
            className="w-full sm:w-44 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#333333] placeholder-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Status badges */}
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
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border transition-all ${active ? 'opacity-100 ring-2 ring-offset-1' : 'opacity-50 hover:opacity-80'}`}
                  style={{ background: meta.color, color: meta.textColor, borderColor: meta.color }}
                >
                  {meta.code}
                </span>
              </label>
            );
          })}

          {/* Installed filter */}
          <select
            name="installed"
            id="sc-installed"
            defaultValue={installed}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[#333333] focus:outline-none focus:border-[#9E9EB0] transition-colors"
          >
            <option value="">All</option>
            <option value="yes">Installed</option>
            <option value="no">Available</option>
          </select>

          {/* Sort */}
          <select
            name="sort"
            id="sc-sort"
            defaultValue={sort}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[#333333] focus:outline-none focus:border-[#9E9EB0] transition-colors"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>Sort: {o.label}</option>
            ))}
          </select>
          <select
            name="dir"
            id="sc-dir"
            defaultValue={dir}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[#333333] focus:outline-none focus:border-[#9E9EB0] transition-colors"
          >
            <option value="asc">↑ Asc</option>
            <option value="desc">↓ Desc</option>
          </select>

          {/* Page size */}
          <select
            name="pageSize"
            id="sc-page-size"
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
            id="sc-search-btn"
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
      {subComponents.length > 0 ? (
        <>
          <SubComponentsBrowseView
            subComponents={subComponents.map((sc) => ({
              id: sc.id,
              type: sc.type,
              serialNumber: sc.serialNumber,
              cumulativeHours: sc.cumulativeHours,
              currentMotorName: sc.assemblies[0]?.motor?.name ?? null,
              isInstalled: Boolean(sc.assemblies[0]?.motor),
            }))}
          />

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
              <span className="px-3 py-1.5 text-[#333333]">{page} / {totalPages || 1}</span>
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
          <div className="text-4xl mb-4 opacity-30">◎</div>
          <p className="text-[#333333] text-sm mb-4">
            {hasFilters ? 'No components match your filters.' : 'No sub-components registered.'}
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
              href="/sub-components/new"
              className="inline-block bg-[#9E9EB0]/10 text-[#9E9EB0] border border-[#9E9EB0]/30 text-sm px-4 py-2 rounded-lg hover:bg-[#9E9EB0]/20 transition-colors"
            >
              Add your first component
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
