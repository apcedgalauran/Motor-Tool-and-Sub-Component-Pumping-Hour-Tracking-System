'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSubComponent } from '@/actions/subcomponent.actions';
import { SUB_COMPONENT_LABELS } from '@/lib/utils';
import Link from 'next/link';

const CUSTOM_TYPE_OPTION = '__OTHER_CUSTOM__';

/** Maps component type keys to their post-creation redirect paths. */
const CATEGORY_REDIRECTS: Record<string, string> = {
  STATOR: '/stators',
  ROTOR: '/rotors',
  SLEEVE: '/motor-sleeves',
};

/** Component types that are top-level asset categories and show extra fields. */
const CATEGORY_TYPES = new Set(['STATOR', 'ROTOR', 'SLEEVE']);

export default function NewSubComponentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [customType, setCustomType] = useState('');
  const [customTypeError, setCustomTypeError] = useState('');

  // Category-specific fields
  const [sapId, setSapId] = useState('');
  const [size, setSize] = useState('');
  const [configuration, setConfiguration] = useState('');
  const [brand, setBrand] = useState('');

  const isCustomTypeSelected = selectedType === CUSTOM_TYPE_OPTION;
  const showAssetFields = CATEGORY_TYPES.has(selectedType);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setCustomTypeError('');

    const resolvedType = isCustomTypeSelected ? customType.trim() : selectedType;
    if (isCustomTypeSelected && !resolvedType) {
      setCustomTypeError('Please enter a component type.');
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await createSubComponent({
        type: resolvedType,
        serialNumber: formData.get('serialNumber') as string,
        notes: (formData.get('notes') as string) || undefined,
        sapId: sapId.trim() || undefined,
        size: size.trim() || undefined,
        configuration: configuration.trim() || undefined,
        brand: brand.trim() || undefined,
      });

      // Redirect to the appropriate category page
      const redirectPath = CATEGORY_REDIRECTS[resolvedType] ?? '/sub-components';
      router.push(redirectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sub-component');
      setLoading(false);
    }
  }

  const componentTypes = (() => {
    const entries = Object.entries(SUB_COMPONENT_LABELS);
    const priority = ['STATOR', 'ROTOR', 'SLEEVE'];
    const prioritySet = new Set(priority);
    const prioritized = priority.flatMap((key) => {
      const entry = entries.find(([value]) => value === key);
      return entry ? [entry] : [];
    });
    const remaining = entries.filter(([value]) => !prioritySet.has(value));
    return [...prioritized, ...remaining];
  })();

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
            value={selectedType}
            onChange={(e) => {
              const nextType = e.target.value;
              setSelectedType(nextType);
              setError('');

              if (nextType !== CUSTOM_TYPE_OPTION) {
                setCustomType('');
                setCustomTypeError('');
              }
              // Clear asset fields when switching away from a category type
              if (!CATEGORY_TYPES.has(nextType)) {
                setSapId('');
                setSize('');
                setConfiguration('');
                setBrand('');
              }
            }}
            className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          >
            <option value="">Select type...</option>
            {componentTypes.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
            <option value={CUSTOM_TYPE_OPTION}>Other / Custom...</option>
          </select>
        </div>

        {isCustomTypeSelected && (
          <div className="animate-fade-in">
            <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Custom Component Type *</label>
            <input
              name="customType"
              value={customType}
              onChange={(e) => {
                setCustomType(e.target.value);
                if (customTypeError && e.target.value.trim()) {
                  setCustomTypeError('');
                }
              }}
              placeholder="Enter component type name"
              className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
              aria-invalid={!!customTypeError}
            />
            {customTypeError && (
              <p className="mt-1.5 text-xs text-red-500">{customTypeError}</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Serial Number *</label>
          <input
            name="serialNumber"
            required
            placeholder="Unique serial number"
            className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
          />
        </div>

        {/* Asset-specific fields — shown for Stator / Rotor / Sleeve */}
        {showAssetFields && (
          <div className="space-y-4 animate-fade-in">
            <div className="border-t border-[var(--border)] pt-4">
              <p className="text-[10px] text-[#9E9EB0] uppercase tracking-wider mb-3 font-medium">Asset Details</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3">
              <div>
                <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">SAP ID</label>
                <input
                  value={sapId}
                  onChange={(e) => setSapId(e.target.value)}
                  placeholder="SAP identifier"
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3">
              <div>
                <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Configuration</label>
                <input
                  value={configuration}
                  onChange={(e) => setConfiguration(e.target.value)}
                  placeholder="Configuration"
                  className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Brand / Type</label>
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Brand or type label"
                  className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

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
