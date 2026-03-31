'use client';

import { useState } from 'react';
import { logPumpingHours } from '@/actions/hours.actions';

type HoursFormProps = {
  motorId: string;
  motorName: string;
  currentHours: number;
};

export function HoursForm({ motorId, motorName }: HoursFormProps) {
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [rigName, setRigName] = useState('');
  const [wellNumber, setWellNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ motor: { pumpingHours: number }; subComponentsUpdated: number } | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);

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

    setLoading(true);
    try {
      const res = await logPumpingHours(motorId, hoursNum, rigName, wellNumber, notes || undefined);
      setResult(res);
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

      {result && (
        <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-600">
          <p className="font-semibold">Hours logged successfully</p>
          <p className="mt-1 text-emerald-600/80">
            {motorName}: {result.motor.pumpingHours.toFixed(1)} hrs total
          </p>
          <p className="text-emerald-600/80">
            {result.subComponentsUpdated} sub-component{result.subComponentsUpdated !== 1 ? 's' : ''} updated
          </p>
        </div>
      )}
    </div>
  );
}
