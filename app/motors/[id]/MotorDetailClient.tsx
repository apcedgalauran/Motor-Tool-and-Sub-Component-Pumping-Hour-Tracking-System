'use client';

import { useState } from 'react';
import { disassembleSubComponent, disperseToolset } from '@/actions/assembly.actions';
import { AssemblyTable } from '@/components/AssemblyTable';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  async function handleDisassemble(assemblyId: string) {
    if (!confirm('Are you sure you want to remove this sub-component?')) return;
    setDisassembling(assemblyId);
    try {
      await disassembleSubComponent(assemblyId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to disassemble');
    } finally {
      setDisassembling(null);
    }
  }

  async function handleDisperse() {
    const active = assemblies.filter((a) => !a.dateRemoved);
    if (active.length === 0) return;
    const list = active.map((a) => `${a.subComponent.type} — ${a.subComponent.serialNumber}`).join('\n');
    if (!confirm(`Remove all assembled sub-components from this motor?\n\n${list}`)) return;
    try {
      await disperseToolset(motorId);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to disperse');
    }
  }

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
            onClick={handleDisperse}
            className="text-xs bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-md hover:bg-red-500/20 transition-colors"
          >
            Disperse Toolset
          </button>
        </div>
      )}

      <AssemblyTable
        assemblies={parsed}
        showActions
        onDisassemble={handleDisassemble}
        disassembling={disassembling}
      />
    </div>
  );
}
