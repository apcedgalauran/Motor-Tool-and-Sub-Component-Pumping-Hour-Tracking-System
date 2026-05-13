'use client';

import { useState } from 'react';
import { ASSET_STATUS_META, type AssetStatus } from '@/lib/asset-status';

interface StatusFilterBadgesProps {
  /** Status keys that are initially active (from URL params) */
  initialStatuses: AssetStatus[];
}

/**
 * Interactive status filter badges for list-page filter bars.
 * Each badge toggles a hidden checkbox that participates in native `<form>` submission.
 * Visual state is managed client-side so clicks give immediate feedback.
 */
export function StatusFilterBadges({ initialStatuses }: StatusFilterBadgesProps) {
  const [selected, setSelected] = useState<Set<AssetStatus>>(
    () => new Set(initialStatuses),
  );

  function toggle(status: AssetStatus) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(ASSET_STATUS_META) as AssetStatus[]).map((s) => {
        const meta = ASSET_STATUS_META[s];
        const active = selected.has(s);

        return (
          <label
            key={s}
            className="flex items-center gap-1 cursor-pointer select-none"
            title={meta.label}
          >
            {/* Hidden checkbox for native form submission */}
            <input
              type="checkbox"
              name="statuses[]"
              value={s}
              checked={active}
              onChange={() => toggle(s)}
              className="sr-only"
            />
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border transition-all ${
                active
                  ? 'opacity-100 scale-110'
                  : 'opacity-40 hover:opacity-70'
              }`}
              style={{
                background: meta.color,
                color: meta.textColor,
                borderColor: active ? '#121212' : meta.color,
                boxShadow: active
                  ? '0 0 0 2px #ffffff, 0 0 0 4px #121212'
                  : 'none',
              }}
            >
              {meta.code}
            </span>
          </label>
        );
      })}
    </div>
  );
}
