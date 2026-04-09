'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMotor, updateMotor } from '@/actions/motor.actions';
import Link from 'next/link';
import DateField from '@/components/DateField';
import { StatusSelector } from '@/components/StatusSelector';

type MotorData = {
  id: string;
  name: string;
  serialNumber: string;
  location: string | null;
  dateOut: string | null;
  dateIn: string | null;
  status: string;
  customStatusId: string | null;
};

export default function EditMotorPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [motor, setMotor] = useState<MotorData | null>(null);

  useEffect(() => {
    params.then(async ({ id }) => {
      const m = await getMotor(id);
      if (!m) {
        router.push('/motors');
        return;
      }
      setMotor({
        id: m.id,
        name: m.name,
        serialNumber: m.serialNumber,
        location: m.location,
        dateOut: m.dateOut ? new Date(m.dateOut).toISOString().split('T')[0] : null,
        dateIn: m.dateIn ? new Date(m.dateIn).toISOString().split('T')[0] : null,
        status: m.status,
        customStatusId: m.customStatusId,
      });
      setFetching(false);
    });
  }, [params, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!motor) return;
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      await updateMotor(motor.id, {
        name: formData.get('name') as string,
        serialNumber: formData.get('serialNumber') as string,
        location: (formData.get('location') as string) || undefined,
        dateOut: (formData.get('dateOut') as string) || null,
        dateIn: (formData.get('dateIn') as string) || null,
        status: (formData.get('status') as string) || 'ON_LOCATION',
        customStatusId: (formData.get('customStatusId') as string) || null,
      });
      router.push(`/motors/${motor.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update motor');
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="text-center py-20">
          <div className="text-sm text-[#333333]">Loading motor data…</div>
        </div>
      </div>
    );
  }

  if (!motor) return null;

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="mb-6">
        <Link
          href={`/motors/${motor.id}`}
          className="inline-flex items-center gap-2 text-sm md:text-base font-semibold text-[#333333] hover:text-[#121212] border border-[var(--border)] rounded-lg px-3 py-2 hover:bg-[var(--card-hover)] transition-colors"
        >
          ← Back to Motor
        </Link>
        <h1 className="text-2xl font-bold text-[#121212] tracking-tight mt-2">Edit Motor</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Motor Name / ID *</label>
          <input
            name="name"
            required
            defaultValue={motor.name}
            className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Serial Number *</label>
          <input
            name="serialNumber"
            required
            defaultValue={motor.serialNumber}
            className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Location</label>
          <input
            name="location"
            defaultValue={motor.location || ''}
            placeholder="Deployment site"
            className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3">
          <DateField name="dateOut" label="Date Out" placeholder="Select start date" defaultValue={motor.dateOut || undefined} />
          <DateField name="dateIn" label="Date In" placeholder="Select return date" defaultValue={motor.dateIn || undefined} />
        </div>

        <StatusSelector defaultStatus={motor.status} defaultCustomStatusId={motor.customStatusId} />

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
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
