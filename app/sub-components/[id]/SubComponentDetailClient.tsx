'use client';

import {
  EDITABLE_SUB_COMPONENT_STATUS_LABELS,
  toEditableSubComponentStatus,
  type EditableSubComponentStatus,
} from '@/lib/subcomponent-shared';
import { SUB_COMPONENT_LABELS, formatDate, formatHours } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type AssemblyRecord = {
  id: string;
  dateAssembled: string;
  dateRemoved: string | null;
  hoursAtAssembly: number;
  hoursAtRemoval: number | null;
  hoursAccrued: number | null;
  motor: {
    id: string;
    name: string;
    serialNumber: string;
  };
};

type SubComponentDetail = {
  id: string;
  type: string;
  serialNumber: string;
  status: string;
  notes: string | null;
  cumulativeHours: number;
  assemblies: AssemblyRecord[];
};

type FlashMessage = {
  tone: 'success' | 'error';
  message: string;
};

export function SubComponentDetailClient({ initialSubComponent }: { initialSubComponent: SubComponentDetail }) {
  const router = useRouter();
  const [subComponent, setSubComponent] = useState(initialSubComponent);

  const [flash, setFlash] = useState<FlashMessage | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editType, setEditType] = useState(initialSubComponent.type);
  const [editSerialNumber, setEditSerialNumber] = useState(initialSubComponent.serialNumber);
  const [editStatus, setEditStatus] = useState<EditableSubComponentStatus>(
    toEditableSubComponentStatus(initialSubComponent.status)
  );
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [isHoursOpen, setIsHoursOpen] = useState(false);
  const [hoursAdded, setHoursAdded] = useState('');
  const [rigName, setRigName] = useState('');
  const [wellNumber, setWellNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoggingHours, setIsLoggingHours] = useState(false);

  const fieldLabelClass = 'block text-xs text-[#333333] mb-1.5 uppercase tracking-wider';
  const fieldControlClass =
    'w-full min-h-11 bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-3 md:py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors';
  const textAreaClass = `${fieldControlClass} min-h-28 resize-none`;
  const modalSecondaryButtonClass =
    'w-full sm:w-auto min-h-11 px-4 py-3 md:py-2.5 rounded-lg border border-[var(--border)] bg-transparent text-sm font-semibold font-mono text-[#333333] hover:bg-[var(--card-hover)] transition-colors';
  const modalPrimaryButtonClass =
    'w-full sm:w-auto min-h-11 px-4 py-3 md:py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold font-mono text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const activeAssembly = useMemo(
    () => subComponent.assemblies.find((assembly) => !assembly.dateRemoved),
    [subComponent.assemblies]
  );

  const isInstalled = Boolean(activeAssembly);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 4500);
    return () => clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    if (!isEditOpen && !isHoursOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isEditOpen, isHoursOpen]);

  const typeLabel = SUB_COMPONENT_LABELS[subComponent.type as keyof typeof SUB_COMPONENT_LABELS] || subComponent.type;
  const componentStatus = toEditableSubComponentStatus(subComponent.status);
  const successBadgeClass = 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30';

  const componentStatusStyleMap: Record<EditableSubComponentStatus, string> = {
    ACTIVE: successBadgeClass,
    IN_MAINTENANCE: 'text-orange-700 bg-orange-500/10 border-orange-500/30',
    RETIRED: 'text-red-600 bg-red-500/10 border-red-500/30',
  };

  const typeOptions = useMemo(() => {
    const baseOptions = Object.entries(SUB_COMPONENT_LABELS);
    if (!subComponent.type || subComponent.type in SUB_COMPONENT_LABELS) {
      return baseOptions;
    }

    return [[subComponent.type, subComponent.type], ...baseOptions] as Array<[string, string]>;
  }, [subComponent.type]);

  function openEdit() {
    setEditType(subComponent.type);
    setEditSerialNumber(subComponent.serialNumber);
    setEditStatus(toEditableSubComponentStatus(subComponent.status));
    setIsEditOpen(true);
  }

  function closeEdit() {
    setIsEditOpen(false);
  }

  function closeHours() {
    setIsHoursOpen(false);
  }

  async function handleSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const serial = editSerialNumber.trim();
    if (!serial) {
      setFlash({ tone: 'error', message: 'Serial Number is required.' });
      return;
    }

    setIsSavingEdit(true);
    try {
      const response = await fetch(`/api/sub-components/${subComponent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editType,
          serialNumber: serial,
          status: editStatus,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update sub-component.');
      }

      const updated = payload.subComponent as Partial<SubComponentDetail>;
      setSubComponent((current) => ({
        ...current,
        type: updated.type ?? current.type,
        serialNumber: updated.serialNumber ?? current.serialNumber,
        status: updated.status ?? current.status,
      }));

      setIsEditOpen(false);
      setFlash({ tone: 'success', message: 'Sub-component updated successfully.' });
      router.refresh();
    } catch (error) {
      setFlash({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Failed to update sub-component.',
      });
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleLogHours(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isInstalled) {
      setFlash({ tone: 'error', message: 'Sub-component must be installed in a motor to log hours.' });
      return;
    }

    const numericHours = Number(hoursAdded);
    if (!Number.isFinite(numericHours) || numericHours <= 0) {
      setFlash({ tone: 'error', message: 'Hours Added must be a positive number.' });
      return;
    }

    if (!rigName.trim() || !wellNumber.trim()) {
      setFlash({ tone: 'error', message: 'Rig Name and Well Number are required.' });
      return;
    }

    setIsLoggingHours(true);
    try {
      const response = await fetch('/api/hour-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subComponentId: subComponent.id,
          hoursAdded: numericHours,
          rigName: rigName.trim(),
          wellNumber: wellNumber.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to log hours.');
      }

      setSubComponent((current) => ({
        ...current,
        cumulativeHours: current.cumulativeHours + numericHours,
      }));

      setHoursAdded('');
      setRigName('');
      setWellNumber('');
      setNotes('');
      setIsHoursOpen(false);
      setFlash({ tone: 'success', message: 'Hours logged successfully.' });
      router.refresh();
    } catch (error) {
      setFlash({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Failed to log hours.',
      });
    } finally {
      setIsLoggingHours(false);
    }
  }

  return (
    <>
      <div className="animate-fade-in w-full min-w-0 max-w-[100vw] overflow-x-hidden">
        <div className="mb-6">
          <Link href="/sub-components" className="text-xs text-[#333333] hover:text-[#121212] transition-colors">
            ← Back to Sub-Components
          </Link>
        </div>

        <div className="flex w-full min-w-0 flex-col justify-between gap-4 mb-6 md:flex-row md:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
              <h1 className="text-2xl font-bold text-[#121212] tracking-tight break-words">{typeLabel}</h1>
              <span
                className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border font-semibold ${
                  isInstalled
                    ? successBadgeClass
                    : 'text-[#333333] bg-[#A3A3A3]/10 border-[#A3A3A3]/30'
                }`}
              >
                {isInstalled ? 'Installed' : 'Available'}
              </span>
              <span
                className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border font-semibold ${
                  componentStatusStyleMap[componentStatus]
                }`}
              >
                {EDITABLE_SUB_COMPONENT_STATUS_LABELS[componentStatus]}
              </span>
            </div>
            <p className="text-sm text-[#333333] font-mono break-all">{subComponent.serialNumber}</p>
            {subComponent.notes && <p className="text-xs text-[#333333] mt-1">{subComponent.notes}</p>}
          </div>

          <div className="w-full min-w-0 md:w-auto md:flex-shrink-0 space-y-2">
            <div className="flex flex-col md:flex-row gap-2">
              <button
                type="button"
                onClick={openEdit}
                className="w-full max-w-full md:w-auto min-h-11 text-center border border-[var(--border)] bg-transparent hover:bg-[var(--card-hover)] text-[#333333] font-semibold font-mono text-sm px-4 py-3 md:py-2.5 rounded-lg transition-all duration-200"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setIsHoursOpen(true)}
                disabled={!isInstalled}
                className="w-full max-w-full md:w-auto min-h-11 text-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold font-mono text-sm px-4 py-3 md:py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Hours
              </button>
            </div>
            {!isInstalled && (
              <p className="text-xs text-[#333333] md:max-w-xs">
                Sub-component must be installed in a motor to log hours.
              </p>
            )}
          </div>
        </div>

        {flash && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
              flash.tone === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                : 'bg-red-500/10 border-red-500/30 text-red-600'
            }`}
          >
            {flash.message}
          </div>
        )}

        <div className="w-full min-w-0 grid grid-cols-1 md:grid-cols-3 gap-3 mb-8 animate-fade-in stagger-1">
          <div className="bg-[var(--card)] border border-[#9E9EB0]/30 rounded-xl p-5">
            <p className="text-[10px] text-[#333333] uppercase tracking-wider mb-1">Lifetime Hours</p>
            <p className="text-3xl font-bold text-[#121212] tracking-tight">{formatHours(subComponent.cumulativeHours)}</p>
            <p className="text-[10px] text-[#333333] mt-1">across all motors</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
            <p className="text-[10px] text-[#333333] uppercase tracking-wider mb-1">Total Assignments</p>
            <p className="text-2xl font-bold text-[#333333] tracking-tight">{subComponent.assemblies.length}</p>
          </div>
          {activeAssembly && (
            <div className="bg-[var(--card)] border border-emerald-500/20 rounded-xl p-5">
              <p className="text-[10px] text-[#333333] uppercase tracking-wider mb-1">Current Motor</p>
              <Link
                href={`/motors/${activeAssembly.motor.id}`}
                className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                {activeAssembly.motor.name}
              </Link>
              <p className="text-[10px] text-[#333333] mt-0.5">
                since {formatDate(activeAssembly.dateAssembled)}
              </p>
            </div>
          )}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 md:p-5 w-full min-w-0 max-w-full">
          <h3 className="text-sm font-semibold text-[#121212] mb-4">Assembly History</h3>

          {subComponent.assemblies.length > 0 ? (
            <div className="w-full min-w-0 max-w-full overflow-x-auto">
              <table className="min-w-[760px] w-max text-xs md:w-full">
                <thead>
                  <tr className="text-[#333333] border-b border-[var(--border)]">
                    <th className="text-left py-2 pr-4 font-medium">Motor</th>
                    <th className="text-left py-2 pr-4 font-medium">Serial</th>
                    <th className="text-left py-2 pr-4 font-medium">Installed</th>
                    <th className="text-left py-2 pr-4 font-medium">Removed</th>
                    <th className="text-right py-2 pr-4 font-medium">Hrs at Install</th>
                    <th className="text-right py-2 pr-4 font-medium">Hrs at Removal</th>
                    <th className="text-right py-2 font-medium">Accrued</th>
                  </tr>
                </thead>
                <tbody>
                  {subComponent.assemblies.map((assembly) => (
                    <tr key={assembly.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2 pr-4 max-w-[11rem]">
                        <Link
                          href={`/motors/${assembly.motor.id}`}
                          className="text-[#333333] hover:text-[#9E9EB0] transition-colors break-words"
                        >
                          {assembly.motor.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-[#333333] font-mono break-all">{assembly.motor.serialNumber}</td>
                      <td className="py-2 pr-4 text-[#333333]">{formatDate(assembly.dateAssembled)}</td>
                      <td className="py-2 pr-4 text-[#333333]">
                        {assembly.dateRemoved ? formatDate(assembly.dateRemoved) : (
                          <span className="text-emerald-600">Active</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right text-[#333333]">{formatHours(assembly.hoursAtAssembly)}</td>
                      <td className="py-2 pr-4 text-right text-[#333333]">
                        {assembly.hoursAtRemoval != null ? formatHours(assembly.hoursAtRemoval) : '—'}
                      </td>
                      <td className="py-2 text-right text-[#121212] font-semibold">
                        {assembly.hoursAccrued != null ? `${formatHours(assembly.hoursAccrued)} hrs` : (
                          <span className="text-emerald-600 font-normal">Running</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[#333333] text-center py-6">No assembly history</p>
          )}
        </div>
      </div>

      {isEditOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 px-4 py-6 sm:px-6 flex items-center justify-center"
          onClick={closeEdit}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-subcomponent-title"
            className="w-[90vw] max-w-[420px] md:max-w-lg max-h-[85vh] overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 sm:p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="edit-subcomponent-title" className="text-lg font-bold font-mono tracking-tight text-[#121212]">
              Edit Sub-Component
            </h2>
            <p className="text-xs text-[#333333] mt-1 mb-4">Update type, serial number, and current status.</p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className={fieldLabelClass}>Component Type *</label>
                <select
                  value={editType}
                  onChange={(event) => setEditType(event.target.value)}
                  required
                  className={fieldControlClass}
                >
                  {typeOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={fieldLabelClass}>Serial Number *</label>
                <input
                  value={editSerialNumber}
                  onChange={(event) => setEditSerialNumber(event.target.value)}
                  required
                  className={fieldControlClass}
                />
              </div>

              <div>
                <label className={fieldLabelClass}>Status *</label>
                <select
                  value={editStatus}
                  onChange={(event) => setEditStatus(event.target.value as EditableSubComponentStatus)}
                  required
                  className={fieldControlClass}
                >
                  {Object.entries(EDITABLE_SUB_COMPONENT_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <button type="button" onClick={closeEdit} className={modalSecondaryButtonClass}>
                  Cancel
                </button>
                <button type="submit" disabled={isSavingEdit} className={modalPrimaryButtonClass}>
                  {isSavingEdit ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isHoursOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 px-4 py-6 sm:px-6 flex items-center justify-center"
          onClick={closeHours}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-hours-title"
            className="w-[90vw] max-w-[420px] md:max-w-lg max-h-[85vh] overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 sm:p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="add-hours-title" className="text-lg font-bold font-mono tracking-tight text-[#121212]">
              Add Hours
            </h2>
            <p className="text-xs text-[#333333] mt-1 mb-4">
              Logging to {activeAssembly?.motor.name || 'current motor'} and applying cascade updates.
            </p>

            <form onSubmit={handleLogHours} className="space-y-4">
              <div>
                <label className={fieldLabelClass}>Hours Added *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={hoursAdded}
                  onChange={(event) => setHoursAdded(event.target.value)}
                  required
                  className={fieldControlClass}
                />
              </div>

              <div>
                <label className={fieldLabelClass}>Rig Name *</label>
                <input
                  value={rigName}
                  onChange={(event) => setRigName(event.target.value)}
                  required
                  className={fieldControlClass}
                />
              </div>

              <div>
                <label className={fieldLabelClass}>Well Number *</label>
                <input
                  value={wellNumber}
                  onChange={(event) => setWellNumber(event.target.value)}
                  required
                  className={fieldControlClass}
                />
              </div>

              <div>
                <label className={fieldLabelClass}>Notes</label>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className={textAreaClass} />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <button type="button" onClick={closeHours} className={modalSecondaryButtonClass}>
                  Cancel
                </button>
                <button type="submit" disabled={isLoggingHours} className={modalPrimaryButtonClass}>
                  {isLoggingHours ? 'Logging...' : 'Log Hours'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
