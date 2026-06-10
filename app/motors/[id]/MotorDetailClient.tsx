'use client';

import { useState, useMemo } from 'react';
import { disassembleSubComponent, disperseToolset } from '@/actions/assembly.actions';
import { AssemblyTable } from '@/components/AssemblyTable';
import { useRouter } from 'next/navigation';
import { ConfirmModal } from '@/components/ConfirmModal';

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

export function MotorDetailClient({ motorId, assemblies }: { motorId: string; assemblies: Assembly[] }) {
  const [disassembling, setDisassembling] = useState<string | null>(null);
  const [pendingDisassembleId, setPendingDisassembleId] = useState<string | null>(null);
  const [isDisassemblingModal, setIsDisassemblingModal] = useState(false);

  const [isDisperseConfirmOpen, setIsDisperseConfirmOpen] = useState(false);
  const [isDispersingModal, setIsDispersingModal] = useState(false);

  const router = useRouter();

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

  return (
    <div>
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
