'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSubComponent } from '@/actions/subcomponent.actions';
import { SUB_COMPONENT_LABELS } from '@/lib/utils';
import Link from 'next/link';

export default function NewSubComponentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      await createSubComponent({
        type: formData.get('type') as string,
        serialNumber: formData.get('serialNumber') as string,
        notes: (formData.get('notes') as string) || undefined,
      });
      router.push('/sub-components');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sub-component');
      setLoading(false);
    }
  }

  const componentTypes = Object.entries(SUB_COMPONENT_LABELS);

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="mb-6">
        <Link href="/sub-components" className="text-xs text-[#333333] hover:text-[#121212] transition-colors">
          ← Back to Sub-Components
        </Link>
        <h1 className="text-2xl font-bold text-[#121212] tracking-tight mt-2">Add Sub-Component</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Component Type *</label>
          <select
            name="type"
            required
            className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          >
            <option value="">Select type...</option>
            {componentTypes.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
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
          <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Notes</label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Any additional notes..."
            className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors resize-none"
          />
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
          {loading ? 'Creating...' : 'Create Sub-Component'}
        </button>
      </form>
    </div>
  );
}
