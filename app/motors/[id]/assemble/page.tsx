'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { assembleSubComponent } from '@/actions/assembly.actions';
import { getAvailableSubComponents } from '@/actions/subcomponent.actions';
import { SUB_COMPONENT_LABELS, formatHours } from '@/lib/utils';
import Link from 'next/link';

type AvailableSubComponent = {
  id: string;
  type: string;
  serialNumber: string;
  cumulativeHours: number;
};

export default function AssemblePage() {
  const router = useRouter();
  const params = useParams();
  const motorId = params.id as string;

  const [available, setAvailable] = useState<AvailableSubComponent[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getAvailableSubComponents();
        setAvailable(data as AvailableSubComponent[]);
      } catch {
        setError('Failed to load available sub-components');
      } finally {
        setFetching(false);
      }
    }
    load();
  }, []);

  async function handleAssemble() {
    if (!selectedId) return;
    setError('');
    setLoading(true);
    try {
      await assembleSubComponent(motorId, selectedId);
      router.push(`/motors/${motorId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assemble');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="mb-6">
        <Link href={`/motors/${motorId}`} className="text-xs text-[#333333] hover:text-[#121212] transition-colors">
          ← Back to Motor
        </Link>
        <h1 className="text-2xl font-bold text-[#121212] tracking-tight mt-2">Assemble Sub-Component</h1>
        <p className="text-sm text-[#333333] mt-1">Select an available sub-component to install</p>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        {fetching ? (
          <p className="text-sm text-[#333333] text-center py-8">Loading available components...</p>
        ) : available.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[#333333] mb-4">No available sub-components</p>
            <Link
              href="/sub-components/new"
              className="inline-block bg-[#9E9EB0] text-white border border-transparent text-sm px-4 py-2 rounded-lg hover:bg-[#585870] transition-colors"
            >
              Create a sub-component first
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {available.map((sc) => (
                <label
                  key={sc.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedId === sc.id
                    ? 'border-[#9E9EB0] bg-[#9E9EB0]/5'
                    : 'border-[var(--border)] hover:border-[#9E9EB0]/50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="subComponent"
                      value={sc.id}
                      checked={selectedId === sc.id}
                      onChange={() => setSelectedId(sc.id)}
                      className="accent-[#9E9EB0]"
                    />
                    <div>
                      <p className="text-sm font-medium text-[#333333]">
                        {SUB_COMPONENT_LABELS[sc.type as keyof typeof SUB_COMPONENT_LABELS] || sc.type}
                      </p>
                      <p className="text-xs text-[#333333] font-mono">{sc.serialNumber}</p>
                    </div>
                  </div>
                  <span className="text-xs text-[#121212] font-semibold">{formatHours(sc.cumulativeHours)} hrs</span>
                </label>
              ))}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500">
                {error}
              </div>
            )}

            <button
              onClick={handleAssemble}
              disabled={!selectedId || loading}
              className="w-full bg-[#9E9EB0] hover:bg-[#8A8A9F] text-white font-semibold text-sm py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Assembling...' : 'Assemble Selected Component'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
