'use client';

/**
 * components/asset-status-selector.tsx
 *
 * Exports two components:
 *  - AssetStatusBadge   — read-only pill showing the single-letter code + full label tooltip
 *  - AssetStatusSelector — interactive picker (native <select> on mobile, styled dropdown on desktop)
 *
 * PRD §4.3 / FR-03 (v2.7)
 */ 
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  type AssetStatus,
  ASSET_STATUS_META,
} from '@/lib/asset-status';

// ---------------------------------------------------------------------------
// AssetStatusBadge — read-only
// ---------------------------------------------------------------------------

interface AssetStatusBadgeProps {
  status: AssetStatus;
  /** When true, only shows the letter code pill (no label text). */
  compact?: boolean;
  className?: string;
}

export function AssetStatusBadge({ status, compact = false, className = '' }: AssetStatusBadgeProps) {
  const meta = ASSET_STATUS_META[status];

  return (
    <span
      title={meta.label}
      className={`inline-flex items-center gap-1.5 font-mono font-semibold ${className}`}
    >
      {/* Letter-code pill */}
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold leading-none flex-shrink-0"
        style={{ backgroundColor: meta.color, color: meta.textColor }}
      >
        {meta.code}
      </span>

      {!compact && (
        <span className="text-xs text-[#333333]">{meta.label}</span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// AssetStatusSelector — interactive picker
// ---------------------------------------------------------------------------

interface AssetStatusSelectorProps {
  value: AssetStatus;
  onChange: (value: AssetStatus) => void;
  /** Optional label rendered above the control. Defaults to "Status". */
  label?: string;
  /** When true, wraps a hidden <input name="status"> for form submission. */
  name?: string;
  disabled?: boolean;
  className?: string;
}

const ALL_STATUSES = Object.keys(ASSET_STATUS_META) as AssetStatus[];

export function AssetStatusSelector({
  value,
  onChange,
  label = 'Status',
  name,
  disabled = false,
  className = '',
}: AssetStatusSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, handleClickOutside]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function select(s: AssetStatus) {
    onChange(s);
    setOpen(false);
  }

  const selectedMeta = ASSET_STATUS_META[value];

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* Hidden input for server-action / form submissions */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* ── MOBILE: native <select> ── */}
      <div className="sm:hidden relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold leading-none flex-shrink-0 pointer-events-none z-10"
          style={{ backgroundColor: selectedMeta.color, color: selectedMeta.textColor }}
        >
          {selectedMeta.code}
        </span>
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as AssetStatus)}
          className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg pl-10 pr-8 py-2.5 text-sm text-[#333333] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {ALL_STATUSES.map((s) => {
            const m = ASSET_STATUS_META[s];
            return (
              <option key={s} value={s}>
                [{m.code}] {m.label}
              </option>
            );
          })}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#A3A3A3] text-[10px]">
          ▼
        </span>
      </div>

      {/* ── DESKTOP: styled dropdown ── */}
      <div ref={containerRef} className="hidden sm:block relative">
        {/* Trigger button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`
            w-full flex items-center gap-2 bg-[#EBEBEB] border border-[var(--border)]
            rounded-lg pl-3 pr-8 py-2.5 text-sm text-[#333333]
            focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30
            transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
            ${open ? 'border-[#9E9EB0] ring-1 ring-[#9E9EB0]/30' : ''}
          `}
        >
          {/* Selected badge */}
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold leading-none flex-shrink-0"
            style={{ backgroundColor: selectedMeta.color, color: selectedMeta.textColor }}
          >
            {selectedMeta.code}
          </span>
          <span className="flex-1 text-left font-mono">{selectedMeta.label}</span>
          <span
            className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#A3A3A3] text-[10px] transition-transform duration-150 ${
              open ? 'rotate-180' : ''
            }`}
          >
            ▼
          </span>
        </button>

        {/* Dropdown panel */}
        {open && (
          <ul
            role="listbox"
            aria-label="Asset Status"
            className="
              absolute z-50 mt-1 w-full bg-[#FAFAFA] border border-[var(--border)]
              rounded-lg shadow-lg overflow-hidden
              animate-[fadeIn_120ms_ease-out]
            "
          >
            {ALL_STATUSES.map((s) => {
              const m = ASSET_STATUS_META[s];
              const isSelected = s === value;
              return (
                <li
                  key={s}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => !disabled && select(s)}
                  className={`
                    flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none
                    transition-colors duration-75
                    ${isSelected
                      ? 'bg-[#EBEBEB] text-[#121212]'
                      : 'text-[#333333] hover:bg-[#EBEBEB]/70'}
                  `}
                >
                  {/* Color-coded code badge */}
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold leading-none flex-shrink-0"
                    style={{ backgroundColor: m.color, color: m.textColor }}
                  >
                    {m.code}
                  </span>

                  {/* Full label */}
                  <span className="text-sm font-mono flex-1">{m.label}</span>

                  {/* Selection tick */}
                  {isSelected && (
                    <span className="text-[#9E9EB0] text-xs">✓</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
