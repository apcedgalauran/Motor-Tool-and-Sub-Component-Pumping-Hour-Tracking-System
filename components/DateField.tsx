'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type DateFieldProps = {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const displayFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
});

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCalendarDays(viewDate: Date) {
  const start = startOfMonth(viewDate);
  const startOffset = start.getDay();
  const first = new Date(start);
  first.setDate(start.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    return date;
  });
}

export default function DateField({ name, label, placeholder = 'Select date', defaultValue }: DateFieldProps) {
  const [value, setValue] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const initial = parseIsoDate(defaultValue ?? '') ?? new Date();
    return startOfMonth(initial);
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const days = useMemo(() => buildCalendarDays(viewDate), [viewDate]);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const monthLabel = monthFormatter.format(viewDate);
  const displayValue = selectedDate ? displayFormatter.format(selectedDate) : '';

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">{label}</label>

      <input type="hidden" name={name} value={value} />

      <input
        type="date"
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          setValue(nextValue);
          const parsed = parseIsoDate(nextValue);
          if (parsed) {
            setViewDate(startOfMonth(parsed));
          }
        }}
        className="md:hidden w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 text-sm text-[#333333] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
      />

      <div className="relative hidden md:block">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="w-full flex items-center justify-between rounded-xl border border-[#C7C7D2] bg-[linear-gradient(180deg,#F8F8FB_0%,#ECECF2_100%)] px-3 py-2.5 text-sm text-[#1F1F1F] shadow-[inset_0_1px_0_#FFFFFF] transition hover:border-[#8F8FA1] focus:outline-none focus:ring-2 focus:ring-[#9E9EB0]/40"
        >
          <span className={displayValue ? 'text-[#1F1F1F]' : 'text-[#8D8D9A]'}>
            {displayValue || placeholder}
          </span>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D2D2DD] bg-white text-[#4E4E5C] shadow-[0_6px_12px_rgba(44,44,64,0.12)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="5" width="18" height="16" rx="3" />
              <path d="M8 3v4M16 3v4M3 10h18" />
            </svg>
          </span>
        </button>

        {open && (
          <div
            role="dialog"
            aria-label={`${label} calendar`}
            className="absolute z-50 mt-2 w-full min-w-[260px] rounded-2xl border border-[#D1D1DE] bg-[linear-gradient(180deg,#F9F9FC_0%,#ECECF2_100%)] p-3 shadow-[0_18px_40px_rgba(34,34,52,0.18)]"
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
                className="rounded-lg border border-transparent px-2 py-1 text-xs font-semibold text-[#4E4E5C] transition hover:border-[#C9C9D4] hover:bg-white"
              >
                Prev
              </button>
              <div className="text-sm font-semibold text-[#1D1D26]">{monthLabel}</div>
              <button
                type="button"
                onClick={() =>
                  setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
                className="rounded-lg border border-transparent px-2 py-1 text-xs font-semibold text-[#4E4E5C] transition hover:border-[#C9C9D4] hover:bg-white"
              >
                Next
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 text-[11px] font-semibold text-[#6B6B78]">
              {WEEKDAYS.map((day) => (
                <div key={day} className="text-center">
                  {day}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1">
              {days.map((date) => {
                const inMonth = date.getMonth() === viewDate.getMonth();
                const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                const isToday = isSameDay(date, today);

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => {
                      setValue(toIsoDate(date));
                      setViewDate(startOfMonth(date));
                      setOpen(false);
                    }}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-[#4E4E5C] text-white shadow-[0_6px_16px_rgba(46,46,68,0.35)]'
                        : inMonth
                          ? 'text-[#1F1F1F] hover:bg-[#DFDFE9]'
                          : 'text-[#A1A1AF] hover:bg-[#E6E6EE]'
                    } ${isToday && !isSelected ? 'border border-[#4E4E5C]' : 'border border-transparent'}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setValue('');
                  setOpen(false);
                }}
                className="rounded-lg border border-[#D2D2DD] bg-white px-2.5 py-1 text-xs font-semibold text-[#6B6B78] transition hover:border-[#B9B9C6] hover:text-[#1F1F1F]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setValue(toIsoDate(now));
                  setViewDate(startOfMonth(now));
                  setOpen(false);
                }}
                className="rounded-lg border border-[#C7C7D2] bg-[#4E4E5C] px-2.5 py-1 text-xs font-semibold text-white shadow-[0_6px_14px_rgba(46,46,68,0.35)]"
              >
                Today
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
