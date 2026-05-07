'use client';

import { useState } from 'react';
import { logPumpingHours } from '@/actions/hours.actions';
import { formatHours, SUB_COMPONENT_LABELS } from '@/lib/utils';

type AssembledSubComponent = {
  id: string;
  type: string;
  serialNumber: string;
  cumulativeHours: number;
};

type HoursFormProps = {
  motorId: string;
  motorName: string;
  /** Sub-components currently assembled on this motor, used to display updated totals on success. */
  assembledSubComponents?: AssembledSubComponent[];
};

type SuccessState = {
  hoursAdded: number;
  rigName: string;
  wellNumber: string;
  updatedComponents: Array<{
    type: string;
    serialNumber: string;
    newCumulativeHours: number;
  }>;
};

export function HoursForm({ motorId, motorName, assembledSubComponents = [] }: HoursFormProps) {
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [rigName, setRigName] = useState('');
  const [wellNumber, setWellNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(null);

    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      setError('Please enter a valid positive number');
      return;
    }

    if (!rigName.trim()) {
      setError('Rig Name is required');
      return;
    }
    if (!wellNumber.trim()) {
      setError('Well Number is required');
      return;
    }

    // Capture form values before clearing for success display
    const submittedHours = hoursNum;
    const submittedRig = rigName.trim();
    const submittedWell = wellNumber.trim();

    setLoading(true);
    try {
      await logPumpingHours(motorId, submittedHours, submittedRig, submittedWell, notes || undefined);

      // Compute per-component new totals client-side:
      // The cascade always adds the same hoursAdded to every currently assembled component.
      const updatedComponents = assembledSubComponents.map((sc) => ({
        type: sc.type,
        serialNumber: sc.serialNumber,
        newCumulativeHours: sc.cumulativeHours + submittedHours,
      }));

      setSuccess({
        hoursAdded: submittedHours,
        rigName: submittedRig,
        wellNumber: submittedWell,
        updatedComponents,
      });

      setHours('');
      setNotes('');
      setRigName('');
      setWellNumber('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log hours');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[#121212] mb-4 flex items-center gap-2">
        <span className="text-[#9E9EB0]">+</span> Log Pumping Hours
      </h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">
            Hours to Add
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="e.g. 24.5"
            required
            className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">
            Notes (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Job site, well name, etc."
            className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">
            Rig Name
          </label>
          <input
            type="text"
            value={rigName}
            onChange={(e) => setRigName(e.target.value)}
            placeholder="e.g. Rig A"
            required
            className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">
            Well Number
          </label>
          <input
            type="text"
            value={wellNumber}
            onChange={(e) => setWellNumber(e.target.value)}
            placeholder="e.g. 12-34-A"
            required
            className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#9E9EB0] hover:bg-[#8A8A9F] text-white font-semibold text-sm py-3 md:py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging...' : 'Log Hours'}
        </button>
      </form>

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-700 space-y-2">
          <p className="font-semibold text-emerald-800">Hours logged — {motorName}</p>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <span className="text-emerald-700/70">Hours added</span>
            <span className="font-semibold">{formatHours(success.hoursAdded)} hrs</span>
            <span className="text-emerald-700/70">Rig</span>
            <span className="font-semibold">{success.rigName}</span>
            <span className="text-emerald-700/70">Well</span>
            <span className="font-semibold">{success.wellNumber}</span>
          </div>

          {success.updatedComponents.length > 0 ? (
            <div className="pt-1 border-t border-emerald-500/20 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-emerald-700/60 mb-1">
                Sub-components updated
              </p>
              {success.updatedComponents.map((sc) => (
                <div key={sc.serialNumber} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-medium">
                      {SUB_COMPONENT_LABELS[sc.type as keyof typeof SUB_COMPONENT_LABELS] || sc.type}
                    </span>
                    <span className="text-emerald-700/60 font-mono ml-1.5">{sc.serialNumber}</span>
                  </div>
                  <span className="font-semibold shrink-0">{formatHours(sc.newCumulativeHours)} hrs</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-emerald-700/70 pt-1 border-t border-emerald-500/20">
              No sub-components were assembled at the time of logging.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
