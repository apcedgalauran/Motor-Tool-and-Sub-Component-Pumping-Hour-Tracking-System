'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createMotor } from '@/actions/motor.actions';
import Link from 'next/link';

export default function NewMotorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      await createMotor({
        name: formData.get('name') as string,
        serialNumber: formData.get('serialNumber') as string,
        location: (formData.get('location') as string) || undefined,
        dateOut: (formData.get('dateOut') as string) || undefined,
        dateIn: (formData.get('dateIn') as string) || undefined,
        status: (formData.get('status') as 'ACTIVE' | 'INACTIVE' | 'IN_MAINTENANCE') || 'ACTIVE',
      });
      router.push('/motors');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create motor');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="mb-6">
        <Link href="/motors" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
          ← Back to Motors
        </Link>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-2">Add New Motor</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Motor Name / ID *</label>
          <input
            name="name"
            required
            placeholder="e.g. Motor A"
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Serial Number *</label>
          <input
            name="serialNumber"
            required
            placeholder="Unique serial number"
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Location</label>
          <input
            name="location"
            placeholder="Deployment site"
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Date Out</label>
            <input
              name="dateOut"
              type="date"
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Date In</label>
            <input
              name="dateIn"
              type="date"
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Status</label>
          <select
            name="status"
            defaultValue="ACTIVE"
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="IN_MAINTENANCE">In Maintenance</option>
          </select>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Motor'}
        </button>
      </form>
    </div>
  );
}
