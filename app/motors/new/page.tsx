'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createMotor } from '@/actions/motor.actions';
import Link from 'next/link';
import DateField from '@/components/DateField';
import { AssetStatusSelector } from '@/components/asset-status-selector';
import type { AssetStatus } from '@/lib/asset-status';

export default function NewMotorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<AssetStatus>('IDLE');
  const [sapId, setSapId] = useState('');
  const [assetType, setAssetType] = useState('');
  const [size, setSize] = useState('');
  const [brandType, setBrandType] = useState('');
  const [connection, setConnection] = useState('');

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
        status: status,
        sapId: sapId || undefined,
        assetType: assetType || undefined,
        size: size || undefined,
        brandType: brandType || undefined,
        connection: connection || undefined,
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
          <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Serial Number *</label>
          <input
            name="serialNumber"
            required
            placeholder="Unique serial number"
            className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-base md:text-lg font-semibold font-mono tracking-wide text-[#1F1F1F] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
        </div>

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
          <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Location</label>
          <input
            name="location"
            placeholder="Deployment site"
            className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3">
          <DateField name="dateOut" label="Date Out" placeholder="Select start date" />
          <DateField name="dateIn" label="Date In" placeholder="Select return date" />
        </div>

        <div className="border-t border-[var(--border)] pt-4 mt-2">
          <p className="text-[10px] text-[#9E9EB0] uppercase tracking-wider font-semibold mb-3">Motor Specifications</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3">
            <div>
              <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">SAP ID</label>
              <input
                value={sapId}
                onChange={(e) => setSapId(e.target.value)}
                placeholder="SAP asset ID"
                className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Asset Type</label>
              <input
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                placeholder="Motor"
                className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Size</label>
              <input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder='e.g. 9 5/8"'
                className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Brand / Type</label>
              <input
                value={brandType}
                onChange={(e) => setBrandType(e.target.value)}
                placeholder="Brand or type label"
                className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Connection</label>
              <input
                value={connection}
                onChange={(e) => setConnection(e.target.value)}
                placeholder="Connection type"
                className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
              />
            </div>
          </div>
        </div>

        <AssetStatusSelector
          value={status}
          onChange={setStatus}
          name="status"
        />

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
