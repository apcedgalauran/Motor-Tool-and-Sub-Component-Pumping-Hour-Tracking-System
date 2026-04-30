'use client';

import DateField from '@/components/DateField';
import { StatusSelector } from '@/components/StatusSelector';
import { formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type InlineMotor = {
  id: string;
  name: string;
  serialNumber: string;
  location: string | null;
  dateOut: string | null;
  dateIn: string | null;
  status: string;
  customStatusId: string | null;
  customStatusColor: string | null;
  pumpingHours: number;
};

type Notice = {
  tone: 'success' | 'error';
  message: string;
};

type MotorInlineEditorProps = {
  initialMotor: InlineMotor;
  activeAssembliesCount: number;
};

function toDateInputValue(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return null;
}

export function MotorInlineEditor({ initialMotor, activeAssembliesCount }: MotorInlineEditorProps) {
  const router = useRouter();

  const [motor, setMotor] = useState<InlineMotor>(initialMotor);
  const [draft, setDraft] = useState<InlineMotor>(initialMotor);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [statusSelectorKey, setStatusSelectorKey] = useState(0);
  const [dateFieldKey, setDateFieldKey] = useState(0);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const dotColor = useMemo(
    () => getStatusColor(motor.status, motor.customStatusColor),
    [motor.customStatusColor, motor.status]
  );

  const secondaryButtonClass =
    'w-full md:w-auto text-center bg-transparent text-[#333333] border border-[var(--border)] text-sm font-semibold font-mono px-4 py-3 md:py-2.5 rounded-lg hover:bg-[var(--card-hover)] transition-colors';
  const primaryButtonClass =
    'w-full md:w-auto text-center bg-[#9E9EB0] text-white border border-transparent text-sm font-semibold font-mono px-4 py-3 md:py-2.5 rounded-lg hover:bg-[#85859a] transition-colors';

  function openEditor() {
    setDraft(motor);
    setStatusSelectorKey((value) => value + 1);
    setDateFieldKey((value) => value + 1);
    setNotice(null);
    setIsEditing(true);
  }

  function cancelEditor() {
    setDraft(motor);
    setStatusSelectorKey((value) => value + 1);
    setDateFieldKey((value) => value + 1);
    setNotice(null);
    setIsEditing(false);
  }

  function updateDraftField<K extends keyof InlineMotor>(key: K, value: InlineMotor[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      serialNumber: String(formData.get('serialNumber') ?? '').trim(),
      location: String(formData.get('location') ?? '').trim(),
      dateOut: String(formData.get('dateOut') ?? '').trim(),
      dateIn: String(formData.get('dateIn') ?? '').trim(),
      status: String(formData.get('status') ?? '').trim(),
      customStatusId: String(formData.get('customStatusId') ?? '').trim(),
    };

    if (!payload.name) {
      setNotice({ tone: 'error', message: 'Motor Name/ID is required.' });
      return;
    }

    if (!payload.serialNumber) {
      setNotice({ tone: 'error', message: 'Serial Number is required.' });
      return;
    }

    if (!payload.status) {
      setNotice({ tone: 'error', message: 'Status is required.' });
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/motors/${motor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          serialNumber: payload.serialNumber,
          location: payload.location || null,
          dateOut: payload.dateOut || null,
          dateIn: payload.dateIn || null,
          status: payload.status,
          customStatusId: payload.customStatusId || null,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update motor.');
      }

      const updatedMotor = result.motor as {
        name: string;
        serialNumber: string;
        location: string | null;
        dateOut: string | null;
        dateIn: string | null;
        status: string;
        customStatusId: string | null;
        pumpingHours: number;
        customStatus?: { color?: string | null } | null;
      };

      const nextMotor: InlineMotor = {
        ...motor,
        name: updatedMotor.name,
        serialNumber: updatedMotor.serialNumber,
        location: updatedMotor.location,
        dateOut: toDateInputValue(updatedMotor.dateOut),
        dateIn: toDateInputValue(updatedMotor.dateIn),
        status: updatedMotor.status,
        customStatusId: updatedMotor.customStatusId,
        customStatusColor: updatedMotor.customStatus?.color ?? null,
        pumpingHours: updatedMotor.pumpingHours,
      };

      setMotor(nextMotor);
      setDraft(nextMotor);
      setIsEditing(false);
      setNotice({ tone: 'success', message: 'Motor updated successfully.' });
      router.refresh();
    } catch (error) {
      setNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Failed to update motor.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-0">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 md:mb-8">
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 md:p-5 space-y-4">
                <div>
                  <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Motor Name / ID *</label>
                  <input
                    name="name"
                    value={draft.name}
                    onChange={(event) => updateDraftField('name', event.target.value)}
                    required
                    className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Serial Number *</label>
                  <input
                    name="serialNumber"
                    value={draft.serialNumber}
                    onChange={(event) => updateDraftField('serialNumber', event.target.value)}
                    required
                    className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-base md:text-lg font-semibold font-mono tracking-wide text-[#1F1F1F] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3">
                  <div>
                    <label className="block text-xs text-[#333333] mb-1.5 uppercase tracking-wider">Location</label>
                    <input
                      name="location"
                      value={draft.location ?? ''}
                      onChange={(event) => updateDraftField('location', event.target.value)}
                      placeholder="Deployment site"
                      className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
                    />
                  </div>

                  <StatusSelector
                    key={statusSelectorKey}
                    defaultStatus={draft.status}
                    defaultCustomStatusId={draft.customStatusId}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-[#121212] tracking-tight break-words">{motor.name}</h1>
                  <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border font-semibold bg-[#f5f5f5] border-[#ddd] text-[#333333]">
                    <span
                      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    {getStatusLabel(motor.status)}
                  </span>
                </div>
                <p className="text-base md:text-lg text-[#1F1F1F] font-semibold font-mono tracking-wide break-all">
                  {motor.serialNumber}
                </p>
                {motor.location && <p className="text-xs text-[#333333] mt-1">{motor.location}</p>}
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEditor}
                  className={secondaryButtonClass}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`${primaryButtonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={openEditor}
                className={secondaryButtonClass}
              >
                Edit Motor
              </button>
            )}

            <Link
              href={`/motors/${motor.id}?tab=assembly`}
              className={primaryButtonClass}
            >
              + Assemble Sub-Component
            </Link>
          </div>
        </div>

        {notice && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
              notice.tone === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                : 'bg-red-500/10 border-red-500/30 text-red-600'
            }`}
          >
            {notice.message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 md:mb-8 animate-fade-in stagger-1">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 md:p-4">
            <p className="text-[10px] text-[#333333] uppercase tracking-wider mb-1">Assembled Parts</p>
            <p className="text-2xl font-bold text-[#333333] tracking-tight">{activeAssembliesCount}</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 md:p-4">
            {isEditing ? (
              <DateField
                key={`date-out-${dateFieldKey}`}
                name="dateOut"
                label="Date Out"
                placeholder="Select start date"
                defaultValue={draft.dateOut ?? undefined}
              />
            ) : (
              <>
                <p className="text-[10px] text-[#333333] uppercase tracking-wider mb-1">Date Out</p>
                <p className="text-sm font-medium text-[#333333]">{formatDate(motor.dateOut)}</p>
              </>
            )}
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 md:p-4">
            {isEditing ? (
              <DateField
                key={`date-in-${dateFieldKey}`}
                name="dateIn"
                label="Date In"
                placeholder="Select return date"
                defaultValue={draft.dateIn ?? undefined}
              />
            ) : (
              <>
                <p className="text-[10px] text-[#333333] uppercase tracking-wider mb-1">Date In</p>
                <p className="text-sm font-medium text-[#333333]">{formatDate(motor.dateIn)}</p>
              </>
            )}
          </div>
        </div>
      </form>
    </>
  );
}
