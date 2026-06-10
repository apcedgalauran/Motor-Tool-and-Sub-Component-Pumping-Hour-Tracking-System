'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { assembleSubComponent, disassembleSubComponent, disperseToolset } from '@/actions/assembly.actions';
import { getAvailableSubComponents } from '@/actions/subcomponent.actions';
import { AssemblyTable } from '@/components/AssemblyTable';
import { ConfirmModal } from '@/components/ConfirmModal';
import { SUB_COMPONENT_LABELS, formatHours } from '@/lib/utils';
import Link from 'next/link';

type AvailableSubComponent = {
  id: string;
  type: string;
  serialNumber: string;
  cumulativeHours: number;
};

type Assembly = {
  id: string;
  dateAssembled: string;
  dateRemoved: string | null;
  hoursAtAssembly: number;
  hoursAtRemoval: number | null;
  hoursAccrued: number | null;
  subComponent: {
    id: string;
    type: string;
    serialNumber: string;
    cumulativeHours: number;
  };
};

type MotorAssemblyTabProps = {
  motorId: string;
  assemblies: Assembly[];
};

export function MotorAssemblyTab({ motorId, assemblies }: MotorAssemblyTabProps) {
  const router = useRouter();

  // --- Disassemble / Disperse state ---
  const [disassembling, setDisassembling] = useState<string | null>(null);
  const [pendingDisassembleId, setPendingDisassembleId] = useState<string | null>(null);
  const [isDisassemblingModal, setIsDisassemblingModal] = useState(false);

  const [isDisperseConfirmOpen, setIsDisperseConfirmOpen] = useState(false);
  const [isDispersingModal, setIsDispersingModal] = useState(false);

  async function executeDisassemble() {
    if (!pendingDisassembleId) return;
    setIsDisassemblingModal(true);
    setDisassembling(pendingDisassembleId);
    try {
      await disassembleSubComponent(pendingDisassembleId);
      setPendingDisassembleId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to disassemble');
    } finally {
      setIsDisassemblingModal(false);
      setDisassembling(null);
    }
  }

  async function executeDisperse() {
    setIsDispersingModal(true);
    try {
      await disperseToolset(motorId);
      setIsDisperseConfirmOpen(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to disperse');
    } finally {
      setIsDispersingModal(false);
    }
  }

  const activeSubComponentsText = useMemo(() => {
    const active = assemblies.filter((a) => !a.dateRemoved);
    return active.map((a) => `${a.subComponent.type} — ${a.subComponent.serialNumber}`).join('\n');
  }, [assemblies]);

  const disassembleTargetText = useMemo(() => {
    if (!pendingDisassembleId) return '';
    const found = assemblies.find((a) => a.id === pendingDisassembleId);
    if (!found) return '';
    return `${found.subComponent.type} (Serial: ${found.subComponent.serialNumber})`;
  }, [pendingDisassembleId, assemblies]);

  // Convert string dates back to Date objects for AssemblyTable
  const parsed = assemblies.map((a) => ({
    ...a,
    dateAssembled: new Date(a.dateAssembled),
    dateRemoved: a.dateRemoved ? new Date(a.dateRemoved) : null,
  }));

  // --- Assemble form state ---
  const [available, setAvailable] = useState<AvailableSubComponent[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [assembleLoading, setAssembleLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [assembleError, setAssembleError] = useState('');
  const [assembleSuccess, setAssembleSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadAvailable = useCallback(async () => {
    setFetching(true);
    try {
      const data = await getAvailableSubComponents();
      setAvailable(data as AvailableSubComponent[]);
    } catch {
      setAssembleError('Failed to load available sub-components');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    void loadAvailable();
  }, [loadAvailable]);

  // Filter available sub-components by search term
  const filteredAvailable = useMemo(() => {
    if (!searchTerm.trim()) return available;
    const q = searchTerm.toLowerCase().trim();
    return available.filter(
      (sc) =>
        sc.serialNumber.toLowerCase().includes(q) ||
        sc.type.toLowerCase().includes(q) ||
        (SUB_COMPONENT_LABELS[sc.type as keyof typeof SUB_COMPONENT_LABELS] || '')
          .toLowerCase()
          .includes(q)
    );
  }, [available, searchTerm]);

  async function handleAssemble() {
    if (!selectedId) return;
    setAssembleError('');
    setAssembleSuccess(false);
    setAssembleLoading(true);
    try {
      await assembleSubComponent(motorId, selectedId);
      setSelectedId('');
      setAssembleSuccess(true);
      // Refresh the page data so assemblies list updates
      router.refresh();
      // Reload available sub-components
      void loadAvailable();
      // Auto-clear success message
      setTimeout(() => setAssembleSuccess(false), 4000);
    } catch (err) {
      setAssembleError(err instanceof Error ? err.message : 'Failed to assemble');
    } finally {
      setAssembleLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Assemble new sub-component */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#121212] mb-1">Assemble Sub-Component</h3>
        <p className="text-xs text-[#333333] mb-4">Select an available sub-component to install on this motor</p>

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
            {/* Search filter */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by serial number or type…"
              className="w-full bg-[#EBEBEB] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[#333333] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#9E9EB0] focus:ring-1 focus:ring-[#9E9EB0]/30 transition-colors"
            />

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {filteredAvailable.length === 0 ? (
                <p className="text-sm text-[#333333] text-center py-4">
                  No components match &ldquo;{searchTerm}&rdquo;
                </p>
              ) : (
                filteredAvailable.map((sc) => (
                  <label
                    key={sc.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedId === sc.id
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
                ))
              )}
            </div>

            {assembleError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500">
                {assembleError}
              </div>
            )}

            {assembleSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-600">
                Sub-component assembled successfully
              </div>
            )}

            <button
              onClick={handleAssemble}
              disabled={!selectedId || assembleLoading}
              className="w-full bg-[#9E9EB0] hover:bg-[#8A8A9F] text-white font-semibold text-sm py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assembleLoading ? 'Assembling...' : 'Assemble Selected Component'}
            </button>
          </div>
        )}
      </div>

      {/* Current assemblies + disperse */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#121212] mb-4">Sub-Components</h3>

        {parsed.filter((a) => !a.dateRemoved).length > 0 && (
          <div className="mb-3 flex justify-end">
            <button
              onClick={() => setIsDisperseConfirmOpen(true)}
              className="text-xs bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-md hover:bg-red-500/20 transition-colors"
            >
              Disperse Toolset
            </button>
          </div>
        )}

        <AssemblyTable
          assemblies={parsed}
          showActions
          onDisassemble={(id) => setPendingDisassembleId(id)}
          disassembling={disassembling}
        />
      </div>

      <ConfirmModal
        isOpen={Boolean(pendingDisassembleId)}
        onClose={() => setPendingDisassembleId(null)}
        onConfirm={executeDisassemble}
        title="Remove Sub-Component"
        message={`Are you sure you want to remove ${disassembleTargetText} from this motor?`}
        confirmText="Remove"
        isDestructive={true}
        isLoading={isDisassemblingModal}
      />

      <ConfirmModal
        isOpen={isDisperseConfirmOpen}
        onClose={() => setIsDisperseConfirmOpen(false)}
        onConfirm={executeDisperse}
        title="Disperse Toolset"
        message={`Remove all assembled sub-components from this motor?\n\n${activeSubComponentsText}`}
        confirmText="Disperse"
        isDestructive={true}
        isLoading={isDispersingModal}
      />
    </div>
  );
}
