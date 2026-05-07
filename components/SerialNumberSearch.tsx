'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { AssetStatusBadge } from '@/components/asset-status-selector';
import { ASSET_STATUS_META, type AssetStatus } from '@/lib/asset-status';

// ─── API Types ────────────────────────────────────────────────────────────────

type MotorResult = {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
  statusCode: string;
  statusLabel: string;
  location: string | null;
  pumpingHours: number;
  sapId: string | null;
  assetType: string | null;
  size: string | null;
  brandType: string | null;
  connection: string | null;
};

type CurrentMotor = {
  id: string;
  name: string;
  serialNumber: string;
} | null;

type SubComponentResult = {
  id: string;
  serialNumber: string;
  sapId: string | null;
  size: string | null;
  brand: string | null;
  configuration: string | null;
  cumulativeHours: number;
  availabilityStatus: string | null;
  status: string;
  statusCode: string;
  statusLabel: string;
  currentMotor: CurrentMotor;
};

type Section<T> = {
  results: T[];
  total: number;
  page: number;
  pageSize: number;
};

type SearchResponse = {
  query: string;
  motors: Section<MotorResult>;
  stators: Section<SubComponentResult>;
  rotors: Section<SubComponentResult>;
  motorSleeves: Section<SubComponentResult>;
};

// ─── Internal State ───────────────────────────────────────────────────────────

type SearchState = {
  motors: Section<MotorResult>;
  stators: Section<SubComponentResult>;
  rotors: Section<SubComponentResult>;
  motorSleeves: Section<SubComponentResult>;
};

const EMPTY_SECTION = { results: [], total: 0, page: 1, pageSize: 20 };

const EMPTY_STATE: SearchState = {
  motors: { ...EMPTY_SECTION },
  stators: { ...EMPTY_SECTION },
  rotors: { ...EMPTY_SECTION },
  motorSleeves: { ...EMPTY_SECTION },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span
      className="inline-block w-4 h-4 border-2 border-[#9E9EB0]/30 border-t-[#9E9EB0] rounded-full animate-spin"
      aria-label="Loading"
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status in ASSET_STATUS_META) {
    return <AssetStatusBadge status={status as AssetStatus} compact />;
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-[var(--border)] bg-[#f5f5f5] font-semibold text-[#333333]">
      {status}
    </span>
  );
}

function EmptyCell() {
  return <span className="text-[#A3A3A3]">—</span>;
}

// Column header styling
const TH_CLASS = "px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#9E9EB0] font-semibold whitespace-nowrap";
const TD_CLASS = "px-4 py-3 whitespace-nowrap";

// ─── Main Component ───────────────────────────────────────────────────────────

export function SerialNumberSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchState>(EMPTY_STATE);

  // Per-section page tracking
  const [motorPage, setMotorPage] = useState(1);
  const [statorPage, setStatorPage] = useState(1);
  const [rotorPage, setRotorPage] = useState(1);
  const [motorSleevePage, setMotorSleevePage] = useState(1);

  const [motorLoadingMore, setMotorLoadingMore] = useState(false);
  const [statorLoadingMore, setStatorLoadingMore] = useState(false);
  const [rotorLoadingMore, setRotorLoadingMore] = useState(false);
  const [motorSleeveLoadingMore, setMotorSleeveLoadingMore] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // ── Debounce ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // ── Initial / fresh search when debounced query changes ────────────────────
  useEffect(() => {
    if (debouncedQuery.length < 1) {
      setData(EMPTY_STATE);
      setError(null);
      setMotorPage(1);
      setStatorPage(1);
      setRotorPage(1);
      setMotorSleevePage(1);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setMotorPage(1);
    setStatorPage(1);
    setRotorPage(1);
    setMotorSleevePage(1);

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&page=1`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Search request failed');
        return res.json() as Promise<SearchResponse>;
      })
      .then((json) => {
        setData({
          motors: json.motors,
          stators: json.stators ?? EMPTY_SECTION,
          rotors: json.rotors ?? EMPTY_SECTION,
          motorSleeves: json.motorSleeves ?? EMPTY_SECTION,
        });
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        setError('Search failed — try again');
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  // ── Generic load-more ───────────────────────────────────────────────────────
  const loadMore = useCallback(
    async (
      sectionKey: keyof SearchState,
      currentPage: number,
      setPage: (p: number) => void,
      setLoadingMore: (v: boolean) => void,
    ) => {
      const nextPage = currentPage + 1;
      setLoadingMore(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}&page=${nextPage}`,
        );
        if (!res.ok) throw new Error('Load more failed');
        const json = (await res.json()) as SearchResponse;
        const newSection = json[sectionKey];
        setData((prev) => ({
          ...prev,
          [sectionKey]: {
            ...newSection,
            results: [...prev[sectionKey].results, ...newSection.results],
          },
        }));
        setPage(nextPage);
      } catch {
        setError('Search failed — try again');
      } finally {
        setLoadingMore(false);
      }
    },
    [debouncedQuery],
  );

  // ── Derived state ───────────────────────────────────────────────────────────
  const hasQuery = debouncedQuery.length >= 1;
  const hasMotors = data.motors.results.length > 0;
  const hasStators = data.stators.results.length > 0;
  const hasRotors = data.rotors.results.length > 0;
  const hasMotorSleeves = data.motorSleeves.results.length > 0;
  const hasResults = hasMotors || hasStators || hasRotors || hasMotorSleeves;
  const isEmpty = hasQuery && !loading && !hasResults;

  return (
    <div className="w-full">
      {/* ── Search Input ─────────────────────────────────────────────────── */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9E9EB0] text-sm pointer-events-none select-none">
          ⌕
        </span>
        <input
          id="serial-number-search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by serial number…"
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl pl-9 pr-10 py-3 text-sm font-mono text-[#121212] placeholder:text-[#A3A3A3] placeholder:font-sans focus:outline-none focus:border-[#9E9EB0] focus:ring-2 focus:ring-[#9E9EB0]/20 transition-all duration-200"
        />
        {loading && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <Spinner />
          </span>
        )}
      </div>

      {/* ── Inline Error ─────────────────────────────────────────────────── */}
      {error && (
        <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5" role="alert">
          <span>⚠</span> {error}
        </p>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {hasQuery && (
        <div className="mt-4 space-y-6">
          {/* Empty state */}
          {isEmpty && (
            <div className="text-center py-10 border border-dashed border-[var(--border)] rounded-xl bg-[var(--card)]">
              <p className="text-sm text-[#333333] mb-1">
                No results for{' '}
                <span className="font-mono font-semibold text-[#121212]">
                  &apos;{debouncedQuery}&apos;
                </span>
              </p>
              <p className="text-xs text-[#A3A3A3] mb-5">
                No motors or parts match that serial number.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link
                  href="/motors/new"
                  id="search-empty-add-motor"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border)] bg-[#EBEBEB] text-[#333333] hover:bg-[var(--card-hover)] hover:border-[#9E9EB0] transition-all duration-200"
                >
                  <span>⊕</span> Add New Motor
                </Link>
                <Link
                  href="/sub-components/new"
                  id="search-empty-add-part"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border)] bg-[#EBEBEB] text-[#333333] hover:bg-[var(--card-hover)] hover:border-[#9E9EB0] transition-all duration-200"
                >
                  <span>⊕</span> Add New Part
                </Link>
              </div>
            </div>
          )}

          {/* ── Motors Section ─────────────────────────────────────────── */}
          {hasMotors && (
            <ResultSection
              id="motors"
              label="Motors"
              count={data.motors.results.length}
              total={data.motors.total}
              hasMore={data.motors.total > data.motors.results.length}
              loadingMore={motorLoadingMore}
              onLoadMore={() => loadMore('motors', motorPage, setMotorPage, setMotorLoadingMore)}
            >
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[#EBEBEB]">
                    <th className={TH_CLASS}>Serial No.</th>
                    <th className={TH_CLASS}>SAP ID</th>
                    <th className={TH_CLASS}>Asset Type</th>
                    <th className={TH_CLASS}>Size</th>
                    <th className={TH_CLASS}>Brand / Type</th>
                    <th className={TH_CLASS}>Connection</th>
                    <th className={TH_CLASS}>Location</th>
                    <th className={`${TH_CLASS} text-right`}>Pump Hrs</th>
                    <th className={TH_CLASS}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.motors.results.map((motor) => (
                    <tr key={motor.id} className="group hover:bg-[var(--card-hover)] transition-colors duration-150">
                      <td className={TD_CLASS}>
                        <Link href={`/motors/${motor.id}`} id={`search-motor-row-${motor.id}`} className="font-mono text-sm font-semibold text-[#121212] group-hover:text-[#9E9EB0] transition-colors block">
                          {motor.serialNumber}
                        </Link>
                      </td>
                      <td className={TD_CLASS}>
                        <Link href={`/motors/${motor.id}`} className="block" tabIndex={-1}>
                          <span className="font-mono text-xs text-[#333333]">{motor.sapId ?? <EmptyCell />}</span>
                        </Link>
                      </td>
                      <td className={TD_CLASS}>
                        <Link href={`/motors/${motor.id}`} className="block" tabIndex={-1}>
                          <span className="text-xs text-[#333333]">{motor.assetType ?? <EmptyCell />}</span>
                        </Link>
                      </td>
                      <td className={TD_CLASS}>
                        <Link href={`/motors/${motor.id}`} className="block" tabIndex={-1}>
                          <span className="text-xs text-[#333333]">{motor.size ?? <EmptyCell />}</span>
                        </Link>
                      </td>
                      <td className={TD_CLASS}>
                        <Link href={`/motors/${motor.id}`} className="block" tabIndex={-1}>
                          <span className="text-xs text-[#333333]">{motor.brandType ?? <EmptyCell />}</span>
                        </Link>
                      </td>
                      <td className={TD_CLASS}>
                        <Link href={`/motors/${motor.id}`} className="block" tabIndex={-1}>
                          <span className="text-xs text-[#333333]">{motor.connection ?? <EmptyCell />}</span>
                        </Link>
                      </td>
                      <td className={TD_CLASS}>
                        <Link href={`/motors/${motor.id}`} className="block" tabIndex={-1}>
                          <span className="text-xs text-[#333333]">{motor.location ?? <EmptyCell />}</span>
                        </Link>
                      </td>
                      <td className={`${TD_CLASS} text-right`}>
                        <Link href={`/motors/${motor.id}`} className="block" tabIndex={-1}>
                          <span className="font-mono text-xs font-semibold text-[#121212]">{motor.pumpingHours.toFixed(1)}</span>
                        </Link>
                      </td>
                      <td className={TD_CLASS}>
                        <Link href={`/motors/${motor.id}`} className="block" tabIndex={-1}>
                          <StatusBadge status={motor.status} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResultSection>
          )}

          {/* ── Stators Section ─────────────────────────────────────────── */}
          {hasStators && (
            <AssetCategorySection
              id="stators"
              label="Stators"
              assetType="Stator"
              data={data.stators}
              loadingMore={statorLoadingMore}
              onLoadMore={() => loadMore('stators', statorPage, setStatorPage, setStatorLoadingMore)}
            />
          )}

          {/* ── Rotors Section ─────────────────────────────────────────── */}
          {hasRotors && (
            <AssetCategorySection
              id="rotors"
              label="Rotors"
              assetType="Rotor"
              data={data.rotors}
              loadingMore={rotorLoadingMore}
              onLoadMore={() => loadMore('rotors', rotorPage, setRotorPage, setRotorLoadingMore)}
            />
          )}

          {/* ── Motor Sleeves Section ──────────────────────────────────── */}
          {hasMotorSleeves && (
            <AssetCategorySection
              id="motorSleeves"
              label="Motor Sleeves"
              assetType="Motor Sleeve"
              data={data.motorSleeves}
              loadingMore={motorSleeveLoadingMore}
              onLoadMore={() => loadMore('motorSleeves', motorSleevePage, setMotorSleevePage, setMotorSleeveLoadingMore)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Reusable Section Wrapper ─────────────────────────────────────────────────

function ResultSection({
  id,
  label,
  count,
  total,
  hasMore,
  loadingMore,
  onLoadMore,
  children,
}: {
  id: string;
  label: string;
  count: number;
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`search-${id}-heading`}>
      <div className="flex items-center justify-between mb-2">
        <h2 id={`search-${id}-heading`} className="text-[10px] font-semibold uppercase tracking-widest text-[#9E9EB0]">
          {label}
        </h2>
        <span className="text-[10px] text-[#A3A3A3]">
          {count} of {total}
        </span>
      </div>

      <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--card)]">
        <div className="overflow-x-auto">
          {children}
        </div>

        {hasMore && (
          <div className="border-t border-[var(--border)] px-4 py-3">
            <button
              id={`search-${id}-load-more`}
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full text-center text-xs font-semibold text-[#9E9EB0] hover:text-[#121212] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingMore ? (
                <>
                  <Spinner /> Loading…
                </>
              ) : (
                `Load more (${total - count} remaining)`
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Asset Category Section (Stators / Rotors / Motor Sleeves) ────────────────

function AssetCategorySection({
  id,
  label,
  assetType,
  data,
  loadingMore,
  onLoadMore,
}: {
  id: string;
  label: string;
  assetType: string;
  data: Section<SubComponentResult>;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    <ResultSection
      id={id}
      label={label}
      count={data.results.length}
      total={data.total}
      hasMore={data.total > data.results.length}
      loadingMore={loadingMore}
      onLoadMore={onLoadMore}
    >
      <table className="w-full min-w-[800px] text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[#EBEBEB]">
            <th className={TH_CLASS}>Serial No.</th>
            <th className={TH_CLASS}>SAP ID</th>
            <th className={TH_CLASS}>Asset Type</th>
            <th className={TH_CLASS}>Size</th>
            <th className={TH_CLASS}>Brand / Type</th>
            <th className={TH_CLASS}>Configuration</th>
            <th className={TH_CLASS}>Location</th>
            <th className={`${TH_CLASS} text-right`}>Pump Hrs</th>
            <th className={TH_CLASS}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {data.results.map((sc) => {
            const location = sc.currentMotor
              ? (sc.currentMotor.name || sc.currentMotor.serialNumber)
              : null;

            return (
              <tr key={sc.id} className="group hover:bg-[var(--card-hover)] transition-colors duration-150">
                <td className={TD_CLASS}>
                  <Link href={`/sub-components/${sc.id}`} id={`search-${id}-row-${sc.id}`} className="font-mono text-sm font-semibold text-[#121212] group-hover:text-[#9E9EB0] transition-colors block">
                    {sc.serialNumber}
                  </Link>
                </td>
                <td className={TD_CLASS}>
                  <Link href={`/sub-components/${sc.id}`} className="block" tabIndex={-1}>
                    <span className="font-mono text-xs text-[#333333]">{sc.sapId ?? <EmptyCell />}</span>
                  </Link>
                </td>
                <td className={TD_CLASS}>
                  <Link href={`/sub-components/${sc.id}`} className="block" tabIndex={-1}>
                    <span className="text-xs text-[#333333]">{assetType}</span>
                  </Link>
                </td>
                <td className={TD_CLASS}>
                  <Link href={`/sub-components/${sc.id}`} className="block" tabIndex={-1}>
                    <span className="text-xs text-[#333333]">{sc.size ?? <EmptyCell />}</span>
                  </Link>
                </td>
                <td className={TD_CLASS}>
                  <Link href={`/sub-components/${sc.id}`} className="block" tabIndex={-1}>
                    <span className="text-xs text-[#333333]">{sc.brand ?? <EmptyCell />}</span>
                  </Link>
                </td>
                <td className={TD_CLASS}>
                  <Link href={`/sub-components/${sc.id}`} className="block" tabIndex={-1}>
                    <span className="text-xs text-[#333333]">{sc.configuration ?? <EmptyCell />}</span>
                  </Link>
                </td>
                <td className={TD_CLASS}>
                  <Link href={`/sub-components/${sc.id}`} className="block" tabIndex={-1}>
                    <span className="text-xs text-[#333333]">{location ?? <EmptyCell />}</span>
                  </Link>
                </td>
                <td className={`${TD_CLASS} text-right`}>
                  <Link href={`/sub-components/${sc.id}`} className="block" tabIndex={-1}>
                    <span className="font-mono text-xs font-semibold text-[#121212]">{sc.cumulativeHours.toFixed(1)}</span>
                  </Link>
                </td>
                <td className={TD_CLASS}>
                  <Link href={`/sub-components/${sc.id}`} className="block" tabIndex={-1}>
                    <StatusBadge status={sc.status} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ResultSection>
  );
}
