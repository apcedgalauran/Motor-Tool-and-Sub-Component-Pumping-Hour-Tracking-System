'use client';

import { useEffect, useMemo, useState } from 'react';

type ExportDataModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type SelectOption = {
  value: string;
  label: string;
};

type FieldOption = {
  key: string;
  label: string;
};

type MotorOption = {
  id: string;
  name: string;
};

type ExportOptionsResponse = {
  motorStatuses: SelectOption[];
  partStatuses: SelectOption[];
  componentTypes: SelectOption[];
  motors: MotorOption[];
  motorFields: FieldOption[];
  partFields: FieldOption[];
};

type ExportType = 'motors' | 'parts';
type ExportFormat = 'CSV' | 'PDF';
type ExportFormatSelection = ExportFormat | 'BOTH';

const overlayClassName =
  'fixed inset-0 z-50 bg-black/55 p-4 sm:p-6 flex items-center justify-center overflow-y-auto';
const modalClassName =
  'w-full max-w-4xl min-w-0 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] overflow-y-auto overflow-x-hidden bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 sm:p-6 shadow-2xl';
const sectionClassName = 'rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 space-y-3';
const sectionTitleClassName = 'text-sm font-semibold text-[#121212]';
const sectionHintClassName = 'text-[11px] text-[#333333]';
const fieldLabelClassName = 'block text-xs text-[#333333] mb-1.5 uppercase tracking-wider';
const controlClassName =
  'w-full min-h-11 bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors';

export function ExportDataModal({ isOpen, onClose }: ExportDataModalProps) {
  const [options, setOptions] = useState<ExportOptionsResponse | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingError, setLoadingError] = useState('');
  const [exportError, setExportError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const [selectedTypes, setSelectedTypes] = useState<Record<ExportType, boolean>>({
    motors: true,
    parts: false,
  });

  const [motorStatuses, setMotorStatuses] = useState<string[]>([]);
  const [motorDateOutFrom, setMotorDateOutFrom] = useState('');
  const [motorDateOutTo, setMotorDateOutTo] = useState('');
  const [onlyHoursThreshold, setOnlyHoursThreshold] = useState(false);
  const [hoursThreshold, setHoursThreshold] = useState('');

  const [partComponentTypes, setPartComponentTypes] = useState<string[]>([]);
  const [partStatuses, setPartStatuses] = useState<string[]>([]);
  const [installedMotorId, setInstalledMotorId] = useState('');

  const [selectedMotorFields, setSelectedMotorFields] = useState<string[]>([]);
  const [selectedPartFields, setSelectedPartFields] = useState<string[]>([]);

  const [format, setFormat] = useState<ExportFormatSelection>('CSV');

  const selectedTypeList = useMemo(
    () => (Object.entries(selectedTypes) as Array<[ExportType, boolean]>).filter(([, value]) => value).map(([key]) => key),
    [selectedTypes]
  );

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    async function loadOptions() {
      setLoadingOptions(true);
      setLoadingError('');

      try {
        const response = await fetch('/api/export', { method: 'GET', cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to load export options.');
        }

        const payload = (await response.json()) as ExportOptionsResponse;
        if (cancelled) return;

        setOptions(payload);
        setSelectedMotorFields((current) =>
          current.length > 0 ? current : payload.motorFields.map((field) => field.key)
        );
        setSelectedPartFields((current) =>
          current.length > 0 ? current : payload.partFields.map((field) => field.key)
        );
      } catch (error) {
        if (cancelled) return;
        setLoadingError(error instanceof Error ? error.message : 'Failed to load export options.');
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isExporting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isExporting, isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  function toggleType(type: ExportType) {
    setSelectedTypes((current) => ({
      ...current,
      [type]: !current[type],
    }));
  }

  function toggleValue(value: string, setValues: React.Dispatch<React.SetStateAction<string[]>>) {
    setValues((current) => {
      if (current.includes(value)) {
        return current.filter((item) => item !== value);
      }
      return [...current, value];
    });
  }

  function toggleField(value: string, type: ExportType) {
    if (type === 'motors') {
      toggleValue(value, setSelectedMotorFields);
      return;
    }

    toggleValue(value, setSelectedPartFields);
  }

  function handleOverlayClick() {
    if (!isExporting) {
      onClose();
    }
  }

  async function handleExport() {
    setExportError('');

    if (selectedTypeList.length === 0) {
      setExportError('Select at least one export type.');
      return;
    }

    if (selectedTypes.motors && selectedMotorFields.length === 0) {
      setExportError('Select at least one motor field.');
      return;
    }

    if (selectedTypes.parts && selectedPartFields.length === 0) {
      setExportError('Select at least one parts field.');
      return;
    }

    const parsedThreshold =
      onlyHoursThreshold && hoursThreshold.trim() ? Number(hoursThreshold.trim()) : null;
    if (onlyHoursThreshold) {
      if (parsedThreshold == null || !Number.isFinite(parsedThreshold) || parsedThreshold < 0) {
        setExportError('Hours threshold must be a valid non-negative number.');
        return;
      }
    }

    if (motorDateOutFrom && motorDateOutTo && motorDateOutFrom > motorDateOutTo) {
      setExportError('Date Out start date must be on or before the end date.');
      return;
    }

    const requestedFormats: ExportFormat[] = format === 'BOTH' ? ['CSV', 'PDF'] : [format];

    setIsExporting(true);
    try {
      for (const exportType of selectedTypeList) {
        for (const exportFormat of requestedFormats) {
          const payload =
            exportType === 'motors'
              ? {
                  type: 'motors',
                  format: exportFormat,
                  fields: selectedMotorFields,
                  filters: {
                    statuses: motorStatuses,
                    dateOutFrom: motorDateOutFrom || null,
                    dateOutTo: motorDateOutTo || null,
                    minHours: onlyHoursThreshold ? parsedThreshold : null,
                  },
                }
              : {
                  type: 'parts',
                  format: exportFormat,
                  fields: selectedPartFields,
                  filters: {
                    componentTypes: partComponentTypes,
                    statuses: partStatuses,
                    installedMotorId: installedMotorId || null,
                  },
                };

          const response = await fetch('/api/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(errorBody?.error || `Failed to export ${exportType}.`);
          }

          const blob = await response.blob();
          if (blob.size === 0) {
            throw new Error('Export failed: generated file is empty.');
          }

          const fileName = getFileNameFromDisposition(
            response.headers.get('content-disposition'),
            `${exportType}-export.${exportFormat.toLowerCase()}`
          );

          downloadBlob(blob, fileName);
          await waitForDownloadTick();
        }
      }

      onClose();
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Failed to export data.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className={overlayClassName} onClick={handleOverlayClick}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-data-title"
        className={modalClassName}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 id="export-data-title" className="text-lg font-bold font-mono tracking-tight text-[#121212]">
              Export Data
            </h2>
            <p className="text-xs text-[#333333] mt-1">
              Choose data, apply filters, pick fields, then export as CSV, PDF, or both.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close export modal"
            onClick={onClose}
            disabled={isExporting}
            className="w-9 h-9 rounded-lg border border-[var(--border)] text-[#333333] hover:bg-[var(--card-hover)] transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {loadingError && (
          <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-600">
            {loadingError}
          </div>
        )}

        {exportError && (
          <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-600">
            {exportError}
          </div>
        )}

        {loadingOptions && (
          <div className="py-10 text-center text-sm text-[#333333]">Loading export options...</div>
        )}

        {!loadingOptions && options && (
          <div className="space-y-5">
            <section className={sectionClassName}>
              <h3 className={sectionTitleClassName}>Step 1 — Choose What To Export</h3>
              <p className={sectionHintClassName}>You can export Motors, Parts, or both in one run.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[#333333]">
                  <input
                    type="checkbox"
                    checked={selectedTypes.motors}
                    onChange={() => toggleType('motors')}
                    className="h-4 w-4"
                  />
                  Motors
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[#333333]">
                  <input
                    type="checkbox"
                    checked={selectedTypes.parts}
                    onChange={() => toggleType('parts')}
                    className="h-4 w-4"
                  />
                  Parts (Sub-Components)
                </label>
              </div>
            </section>

            {(selectedTypes.motors || selectedTypes.parts) && (
              <section className={sectionClassName}>
                <h3 className={sectionTitleClassName}>Step 2 — Filters</h3>

                {selectedTypes.motors && (
                  <div className="space-y-3 border border-[var(--border)] rounded-lg bg-[var(--card)] p-3">
                    <h4 className="text-xs uppercase tracking-wider text-[#333333] font-semibold">Motors</h4>

                    <div>
                      <label className={fieldLabelClassName}>Status</label>
                      <p className="text-[11px] text-[#333333] mb-2">If none are checked, all statuses are included.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                        {options.motorStatuses.map((status) => (
                          <label key={status.value} className="flex items-center gap-2 text-sm text-[#333333]">
                            <input
                              type="checkbox"
                              checked={motorStatuses.includes(status.value)}
                              onChange={() => toggleValue(status.value, setMotorStatuses)}
                              className="h-4 w-4"
                            />
                            {status.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="motor-date-out-from" className={fieldLabelClassName}>Date Out From</label>
                        <input
                          id="motor-date-out-from"
                          type="date"
                          value={motorDateOutFrom}
                          onChange={(event) => setMotorDateOutFrom(event.target.value)}
                          className={controlClassName}
                        />
                      </div>
                      <div>
                        <label htmlFor="motor-date-out-to" className={fieldLabelClassName}>Date Out To</label>
                        <input
                          id="motor-date-out-to"
                          type="date"
                          value={motorDateOutTo}
                          onChange={(event) => setMotorDateOutTo(event.target.value)}
                          className={controlClassName}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-[#333333]">
                        <input
                          type="checkbox"
                          checked={onlyHoursThreshold}
                          onChange={(event) => setOnlyHoursThreshold(event.target.checked)}
                          className="h-4 w-4"
                        />
                        Only include motors with pumping hours greater than
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={hoursThreshold}
                        onChange={(event) => setHoursThreshold(event.target.value)}
                        disabled={!onlyHoursThreshold}
                        className={controlClassName}
                        placeholder="e.g. 100"
                      />
                    </div>
                  </div>
                )}

                {selectedTypes.parts && (
                  <div className="space-y-3 border border-[var(--border)] rounded-lg bg-[var(--card)] p-3">
                    <h4 className="text-xs uppercase tracking-wider text-[#333333] font-semibold">Parts</h4>

                    <div>
                      <label className={fieldLabelClassName}>Component Type</label>
                      <p className="text-[11px] text-[#333333] mb-2">If none are checked, all component types are included.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                        {options.componentTypes.map((componentType) => (
                          <label key={componentType.value} className="flex items-center gap-2 text-sm text-[#333333]">
                            <input
                              type="checkbox"
                              checked={partComponentTypes.includes(componentType.value)}
                              onChange={() => toggleValue(componentType.value, setPartComponentTypes)}
                              className="h-4 w-4"
                            />
                            {componentType.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={fieldLabelClassName}>Status</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {options.partStatuses.map((status) => (
                          <label key={status.value} className="flex items-center gap-2 text-sm text-[#333333]">
                            <input
                              type="checkbox"
                              checked={partStatuses.includes(status.value)}
                              onChange={() => toggleValue(status.value, setPartStatuses)}
                              className="h-4 w-4"
                            />
                            {status.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="installed-motor-filter" className={fieldLabelClassName}>
                        Installed In Specific Motor (Optional)
                      </label>
                      <select
                        id="installed-motor-filter"
                        value={installedMotorId}
                        onChange={(event) => setInstalledMotorId(event.target.value)}
                        className={controlClassName}
                      >
                        <option value="">Any Motor</option>
                        {options.motors.map((motor) => (
                          <option key={motor.id} value={motor.id}>
                            {motor.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </section>
            )}

            {(selectedTypes.motors || selectedTypes.parts) && (
              <section className={sectionClassName}>
                <h3 className={sectionTitleClassName}>Step 3 — Select Fields To Include</h3>

                {selectedTypes.motors && (
                  <div className="space-y-2 border border-[var(--border)] rounded-lg bg-[var(--card)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs uppercase tracking-wider text-[#333333] font-semibold">Motors</h4>
                      <button
                        type="button"
                        className="text-[11px] text-[#333333] hover:text-[#121212] underline"
                        onClick={() => setSelectedMotorFields(options.motorFields.map((field) => field.key))}
                      >
                        Select all
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {options.motorFields.map((field) => (
                        <label key={field.key} className="flex items-center gap-2 text-sm text-[#333333]">
                          <input
                            type="checkbox"
                            checked={selectedMotorFields.includes(field.key)}
                            onChange={() => toggleField(field.key, 'motors')}
                            className="h-4 w-4"
                          />
                          {field.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTypes.parts && (
                  <div className="space-y-2 border border-[var(--border)] rounded-lg bg-[var(--card)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs uppercase tracking-wider text-[#333333] font-semibold">Parts</h4>
                      <button
                        type="button"
                        className="text-[11px] text-[#333333] hover:text-[#121212] underline"
                        onClick={() => setSelectedPartFields(options.partFields.map((field) => field.key))}
                      >
                        Select all
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {options.partFields.map((field) => (
                        <label key={field.key} className="flex items-center gap-2 text-sm text-[#333333]">
                          <input
                            type="checkbox"
                            checked={selectedPartFields.includes(field.key)}
                            onChange={() => toggleField(field.key, 'parts')}
                            className="h-4 w-4"
                          />
                          {field.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            <section className={sectionClassName}>
              <h3 className={sectionTitleClassName}>Step 4 — Format</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[#333333]">
                  <input
                    type="radio"
                    name="export-format"
                    value="CSV"
                    checked={format === 'CSV'}
                    onChange={() => setFormat('CSV')}
                    className="h-4 w-4"
                  />
                  CSV
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[#333333]">
                  <input
                    type="radio"
                    name="export-format"
                    value="PDF"
                    checked={format === 'PDF'}
                    onChange={() => setFormat('PDF')}
                    className="h-4 w-4"
                  />
                  PDF
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[#333333]">
                  <input
                    type="radio"
                    name="export-format"
                    value="BOTH"
                    checked={format === 'BOTH'}
                    onChange={() => setFormat('BOTH')}
                    className="h-4 w-4"
                  />
                  Both
                </label>
              </div>
            </section>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="w-full sm:w-auto min-h-11 px-4 py-2.5 rounded-lg border border-[var(--border)] bg-transparent text-sm font-semibold font-mono text-[#333333] hover:bg-[var(--card-hover)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || loadingOptions || !options}
            className="w-full sm:w-auto min-h-11 px-4 py-2.5 rounded-lg bg-[#9E9EB0] hover:bg-[#8A8A9F] text-white text-sm font-semibold font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}

function getFileNameFromDisposition(disposition: string | null, fallback: string): string {
  if (!disposition) {
    return fallback;
  }

  const match = disposition.match(/filename="?([^";]+)"?/i);
  if (!match || !match[1]) {
    return fallback;
  }

  return match[1];
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function waitForDownloadTick(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 80);
  });
}