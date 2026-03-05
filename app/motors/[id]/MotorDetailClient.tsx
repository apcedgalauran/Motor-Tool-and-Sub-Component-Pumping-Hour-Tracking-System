'use client';

import { useState } from 'react';
import { disassembleSubComponent } from '@/actions/assembly.actions';
import { AssemblyTable } from '@/components/AssemblyTable';

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

export function MotorDetailClient({ assemblies }: { assemblies: Assembly[] }) {
  const [disassembling, setDisassembling] = useState<string | null>(null);

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

  // Convert string dates back to Date objects for AssemblyTable
  const parsed = assemblies.map((a) => ({
    ...a,
    dateAssembled: new Date(a.dateAssembled),
    dateRemoved: a.dateRemoved ? new Date(a.dateRemoved) : null,
  }));

  return (
    <AssemblyTable
      assemblies={parsed}
      showActions
      onDisassemble={handleDisassemble}
      disassembling={disassembling}
    />
  );
}
