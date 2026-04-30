'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getStatusColor, getStatusLabel, SUB_COMPONENT_LABELS } from '@/lib/utils';

// ─── API Types ────────────────────────────────────────────────────────────────

type CustomStatus = {
  label: string;
  color: string;
} | null;

type MotorResult = {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
  location: string | null;
  customStatus: CustomStatus;
};

type CurrentMotor = {
  id: string;
  name: string;
  serialNumber: string;
} | null;

type SubComponentResult = {
  id: string;
  type: string;
  serialNumber: string;
  cumulativeHours: number;
  status: string;
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
  subComponents: Section<SubComponentResult>;
};

// ─── Internal State ───────────────────────────────────────────────────────────

type PartialSection<T> = {
  results: T[];
  total: number;
  page: number;
  pageSize: number;
};

type SearchState = {
  motors: PartialSection<MotorResult>;
  subComponents: PartialSection<SubComponentResult>;
};

const EMPTY_STATE: SearchState = {
  motors: { results: [], total: 0, page: 1, pageSize: 20 },
  subComponents: { results: [], total: 0, page: 1, pageSize: 20 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusDot({ status, customStatus }: { status: string; customStatus: CustomStatus }) {
  const color = getStatusColor(status, customStatus?.color);
  const label = customStatus?.label ?? getStatusLabel(status);
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-[var(--border)] bg-[#f5f5f5] font-semibold text-[#333333]">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block w-4 h-4 border-2 border-[#9E9EB0]/30 border-t-[#9E9EB0] rounded-full animate-spin"
      aria-label="Loading"
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SerialNumberSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchState>(EMPTY_STATE);

  // Tracks the in-flight page fetch per section so we can append results
  const [motorPage, setMotorPage] = useState(1);
  const [subComponentPage, setSubComponentPage] = useState(1);
  const [motorLoadingMore, setMotorLoadingMore] = useState(false);
  const [subComponentLoadingMore, setSubComponentLoadingMore] = useState(false);

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
      setSubComponentPage(1);
      return;
    }

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setMotorPage(1);
    setSubComponentPage(1);

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
          subComponents: json.subComponents,
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

  // ── Load more: motors ───────────────────────────────────────────────────────
  const loadMoreMotors = useCallback(async () => {
    const nextPage = motorPage + 1;
    setMotorLoadingMore(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(debouncedQuery)}&page=${nextPage}`,
      );
      if (!res.ok) throw new Error('Load more failed');
      const json = (await res.json()) as SearchResponse;
      setData((prev) => ({
        ...prev,
        motors: {
          ...json.motors,
          results: [...prev.motors.results, ...json.motors.results],
        },
      }));
      setMotorPage(nextPage);
    } catch {
      setError('Search failed — try again');
    } finally {
      setMotorLoadingMore(false);
    }
  }, [debouncedQuery, motorPage]);

  // ── Load more: sub-components ───────────────────────────────────────────────
  const loadMoreSubComponents = useCallback(async () => {
    const nextPage = subComponentPage + 1;
    setSubComponentLoadingMore(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(debouncedQuery)}&page=${nextPage}`,
      );
      if (!res.ok) throw new Error('Load more failed');
      const json = (await res.json()) as SearchResponse;
      setData((prev) => ({
        ...prev,
        subComponents: {
          ...json.subComponents,
          results: [...prev.subComponents.results, ...json.subComponents.results],
        },
      }));
      setSubComponentPage(nextPage);
    } catch {
      setError('Search failed — try again');
    } finally {
      setSubComponentLoadingMore(false);
    }
  }, [debouncedQuery, subComponentPage]);

  // ── Derived state ───────────────────────────────────────────────────────────
  const hasQuery = debouncedQuery.length >= 1;
  const hasMotors = data.motors.results.length > 0;
  const hasSubComponents = data.subComponents.results.length > 0;
  const hasResults = hasMotors || hasSubComponents;
  const isEmpty = hasQuery && !loading && !hasResults;

  const motorHasMore = data.motors.total > data.motors.results.length;
  const subComponentHasMore = data.subComponents.total > data.subComponents.results.length;

  return (
    <div className="w-full">
      {/* ── Search Input ─────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Search icon */}
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

        {/* Inline spinner — only inside the input, never replaces results */}
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
            <section aria-labelledby="search-motors-heading">
              <div className="flex items-center justify-between mb-2">
                <h2
                  id="search-motors-heading"
                  className="text-[10px] font-semibold uppercase tracking-widest text-[#9E9EB0]"
                >
                  Motors
                </h2>
                <span className="text-[10px] text-[#A3A3A3]">
                  {data.motors.results.length} of {data.motors.total}
                </span>
              </div>

              <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--card)]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[#EBEBEB]">
                        <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#9E9EB0] font-semibold whitespace-nowrap">
                          Serial No.
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#9E9EB0] font-semibold whitespace-nowrap">
                          Name
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#9E9EB0] font-semibold whitespace-nowrap">
                          Status
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#9E9EB0] font-semibold whitespace-nowrap">
                          Location
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {data.motors.results.map((motor) => (
                        <tr
                          key={motor.id}
                          className="group hover:bg-[var(--card-hover)] transition-colors duration-150"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Link
                              href={`/motors/${motor.id}`}
                              id={`search-motor-row-${motor.id}`}
                              className="font-mono text-sm font-semibold text-[#121212] group-hover:text-[#9E9EB0] transition-colors block w-full h-full"
                            >
                              {motor.serialNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Link href={`/motors/${motor.id}`} className="block w-full h-full" tabIndex={-1}>
                              <span className="text-xs text-[#333333]">{motor.name}</span>
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Link href={`/motors/${motor.id}`} className="block w-full h-full" tabIndex={-1}>
                              <StatusDot status={motor.status} customStatus={motor.customStatus} />
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Link href={`/motors/${motor.id}`} className="block w-full h-full" tabIndex={-1}>
                              <span className="text-xs text-[#333333]">
                                {motor.location ?? <span className="text-[#A3A3A3]">—</span>}
                              </span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Load more — motors */}
                {motorHasMore && (
                  <div className="border-t border-[var(--border)] px-4 py-3">
                    <button
                      id="search-motors-load-more"
                      onClick={loadMoreMotors}
                      disabled={motorLoadingMore}
                      className="w-full text-center text-xs font-semibold text-[#9E9EB0] hover:text-[#121212] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {motorLoadingMore ? (
                        <>
                          <Spinner /> Loading…
                        </>
                      ) : (
                        `Load more (${data.motors.total - data.motors.results.length} remaining)`
                      )}
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Sub-Components Section ──────────────────────────────────── */}
          {hasSubComponents && (
            <section aria-labelledby="search-parts-heading">
              <div className="flex items-center justify-between mb-2">
                <h2
                  id="search-parts-heading"
                  className="text-[10px] font-semibold uppercase tracking-widest text-[#9E9EB0]"
                >
                  Parts
                </h2>
                <span className="text-[10px] text-[#A3A3A3]">
                  {data.subComponents.results.length} of {data.subComponents.total}
                </span>
              </div>

              <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--card)]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[#EBEBEB]">
                        <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#9E9EB0] font-semibold whitespace-nowrap">
                          Serial No.
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#9E9EB0] font-semibold whitespace-nowrap">
                          Type
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#9E9EB0] font-semibold whitespace-nowrap">
                          Cumulative Hours
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#9E9EB0] font-semibold whitespace-nowrap">
                          Current Motor
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {data.subComponents.results.map((sc) => (
                        <tr
                          key={sc.id}
                          className="group hover:bg-[var(--card-hover)] transition-colors duration-150"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Link
                              href={`/sub-components/${sc.id}`}
                              id={`search-sc-row-${sc.id}`}
                              className="font-mono text-sm font-semibold text-[#121212] group-hover:text-[#9E9EB0] transition-colors block w-full h-full"
                            >
                              {sc.serialNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Link href={`/sub-components/${sc.id}`} className="block w-full h-full" tabIndex={-1}>
                              <span className="text-xs text-[#333333]">
                                {SUB_COMPONENT_LABELS[sc.type] ?? sc.type}
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Link href={`/sub-components/${sc.id}`} className="block w-full h-full" tabIndex={-1}>
                              <span className="font-mono text-xs text-[#121212]">
                                {sc.cumulativeHours.toFixed(1)} hrs
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Link href={`/sub-components/${sc.id}`} className="block w-full h-full" tabIndex={-1}>
                              {sc.currentMotor ? (
                                <span className="font-mono text-xs text-[#333333]">
                                  {sc.currentMotor.serialNumber}
                                </span>
                              ) : (
                                <span className="text-xs text-[#A3A3A3]">Unassigned</span>
                              )}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Load more — sub-components */}
                {subComponentHasMore && (
                  <div className="border-t border-[var(--border)] px-4 py-3">
                    <button
                      id="search-parts-load-more"
                      onClick={loadMoreSubComponents}
                      disabled={subComponentLoadingMore}
                      className="w-full text-center text-xs font-semibold text-[#9E9EB0] hover:text-[#121212] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {subComponentLoadingMore ? (
                        <>
                          <Spinner /> Loading…
                        </>
                      ) : (
                        `Load more (${data.subComponents.total - data.subComponents.results.length} remaining)`
                      )}
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
