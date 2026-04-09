'use client';

import { useState, useEffect } from 'react';
import { getCustomStatuses, createCustomStatus } from '@/actions/custom-status.actions';
import {
  STANDARD_MOTOR_STATUSES,
  MOTOR_STATUS_LABELS,
  MOTOR_STATUS_COLORS,
  getStatusColor,
} from '@/lib/utils';

type CustomStatus = {
  id: string;
  label: string;
  color: string;
  isPermanent: boolean;
};

type StatusSelectorProps = {
  defaultStatus?: string;
  defaultCustomStatusId?: string | null;
};

export function StatusSelector({ defaultStatus = 'ON_LOCATION', defaultCustomStatusId = null }: StatusSelectorProps) {
  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);
  const [selectedValue, setSelectedValue] = useState(defaultStatus);
  const [customStatusId, setCustomStatusId] = useState<string | null>(defaultCustomStatusId);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCustomStatuses().then(setCustomStatuses);
  }, []);

  // Determine if the default status is a custom one (not in standard list)
  useEffect(() => {
    if (
      defaultStatus &&
      !STANDARD_MOTOR_STATUSES.includes(defaultStatus as any) &&
      defaultStatus !== '__OTHER__'
    ) {
      // It's a custom status value — check if it's in permanent customs
      const match = customStatuses.find((cs) => cs.label === defaultStatus);
      if (match) {
        setSelectedValue(match.label);
        setCustomStatusId(match.id);
      } else {
        // One-time custom — show it as "Other"
        setSelectedValue('__OTHER__');
        setCustomLabel(defaultStatus);
        setShowCustomInput(true);
      }
    }
  }, [defaultStatus, customStatuses]);

  function handleSelectChange(value: string) {
    if (value === '__OTHER__') {
      setSelectedValue('__OTHER__');
      setShowCustomInput(true);
      setCustomStatusId(null);
    } else {
      setSelectedValue(value);
      setShowCustomInput(false);
      setCustomLabel('');
      // Check if this is a custom status
      const match = customStatuses.find((cs) => cs.label === value);
      setCustomStatusId(match?.id || null);
    }
  }

  async function handleCustomConfirm() {
    if (!customLabel.trim()) return;
    setSaving(true);
    try {
      if (isPermanent) {
        const created = await createCustomStatus(customLabel.trim(), true);
        setCustomStatusId(created.id);
        setSelectedValue(created.label);
        // Refresh the list
        const updated = await getCustomStatuses();
        setCustomStatuses(updated);
        setShowCustomInput(false);
      } else {
        // One-time: just store the label as the status string
        setSelectedValue(customLabel.trim());
        setCustomStatusId(null);
        setShowCustomInput(false);
      }
    } catch (err) {
      console.error('Failed to create custom status', err);
    } finally {
      setSaving(false);
    }
  }

  // Compute the actual status value for the form
  const resolvedStatus = showCustomInput ? customLabel.trim() : selectedValue;
  const dotColor = getStatusColor(
    resolvedStatus,
    customStatuses.find((cs) => cs.label === resolvedStatus)?.color
  );

  return (
    <div>
      <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Status</label>

      {/* Hidden inputs for form submission */}
      <input type="hidden" name="status" value={resolvedStatus || 'ON_LOCATION'} />
      <input type="hidden" name="customStatusId" value={customStatusId || ''} />

      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <select
          value={showCustomInput ? '__OTHER__' : selectedValue}
          onChange={(e) => handleSelectChange(e.target.value)}
          className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg pl-8 pr-3 py-2.5 text-sm text-[#333333] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors appearance-none cursor-pointer"
        >
          {STANDARD_MOTOR_STATUSES.map((s) => (
            <option key={s} value={s}>
              {MOTOR_STATUS_LABELS[s]}
            </option>
          ))}

          {customStatuses.length > 0 && (
            <optgroup label="Custom Statuses">
              {customStatuses.map((cs) => (
                <option key={cs.id} value={cs.label}>
                  {cs.label}
                </option>
              ))}
            </optgroup>
          )}

          <option value="__OTHER__">Other (custom)…</option>
        </select>

        {/* Dropdown chevron */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#A3A3A3] text-[10px]">
          ▼
        </span>
      </div>

      {/* Custom status input */}
      {showCustomInput && (
        <div className="mt-3 space-y-3 p-3 bg-[#EBEBEB]/60 border border-[var(--border)] rounded-lg animate-fade-in">
          <div>
            <label className="block text-[10px] text-[#333333] mb-1 uppercase tracking-wider">
              Custom Status Name
            </label>
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g. Awaiting Parts"
              className="w-full bg-white border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-[#333333] flex-1">Keep this status permanently?</label>
            <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsPermanent(false)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  !isPermanent
                    ? 'bg-[#9E9EB0] text-white'
                    : 'bg-white text-[#333333] hover:bg-[#f0f0f0]'
                }`}
              >
                One-time
              </button>
              <button
                type="button"
                onClick={() => setIsPermanent(true)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  isPermanent
                    ? 'bg-[#9E9EB0] text-white'
                    : 'bg-white text-[#333333] hover:bg-[#f0f0f0]'
                }`}
              >
                Permanent
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCustomConfirm}
            disabled={!customLabel.trim() || saving}
            className="w-full bg-[#9E9EB0] hover:bg-[#8A8A9F] text-white text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : isPermanent ? 'Save & Apply Status' : 'Apply One-time Status'}
          </button>
        </div>
      )}
    </div>
  );
}
