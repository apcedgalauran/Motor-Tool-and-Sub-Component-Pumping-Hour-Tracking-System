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
        <Link
          href="/motors"
          className="inline-flex items-center gap-2 text-sm md:text-base font-semibold text-[#333333] hover:text-[#121212] border border-[var(--border)] rounded-lg px-3 py-2 hover:bg-[var(--card-hover)] transition-colors"
        >
          ← Back to Motors
        </Link>
        <h1 className="text-2xl font-bold text-[#121212] tracking-tight mt-2">Add New Motor</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Motor Name / ID *</label>
          <input
            name="name"
            required
            placeholder="e.g. Motor A"
            className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Serial Number *</label>
          <input
            name="serialNumber"
            required
            placeholder="Unique serial number"
            className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Location</label>
          <input
            name="location"
            placeholder="Deployment site"
            className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3">
          <div>
            <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Date Out</label>
            <input
              name="dateOut"
              type="date"
              className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Date In</label>
            <input
              name="dateIn"
              type="date"
              className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Status</label>
          <select
            name="status"
            defaultValue="ACTIVE"
            className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[#333333] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="IN_MAINTENANCE">In Maintenance</option>
          </select>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#9E9EB0] hover:bg-[#8A8A9F] text-white font-semibold text-sm py-3 md:py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Motor'}
        </button>
      </form>
    </div>
  );
}
