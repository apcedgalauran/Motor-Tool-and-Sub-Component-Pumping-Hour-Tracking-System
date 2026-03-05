'use client';

import { useState } from 'react';
import { logPumpingHours } from '@/actions/hours.actions';

type HoursFormProps = {
  motorId: string;
  motorName: string;
  currentHours: number;
};

export function HoursForm({ motorId, motorName, currentHours }: HoursFormProps) {
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
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

    setLoading(true);
    try {
      const res = await logPumpingHours(motorId, hoursNum, notes || undefined);
      setResult(res);
      setHours('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log hours');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
        <span className="text-amber-500">+</span> Log Pumping Hours
      </h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">
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
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">
            Notes (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Job site, well name, etc."
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging...' : 'Log Hours'}
        </button>
      </form>

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400">
          <p className="font-semibold">Hours logged successfully</p>
          <p className="mt-1 text-emerald-500/80">
            {motorName}: {result.motor.pumpingHours.toFixed(1)} hrs total
          </p>
          <p className="text-emerald-500/80">
            {result.subComponentsUpdated} sub-component{result.subComponentsUpdated !== 1 ? 's' : ''} updated
          </p>
        </div>
      )}
    </div>
  );
}
