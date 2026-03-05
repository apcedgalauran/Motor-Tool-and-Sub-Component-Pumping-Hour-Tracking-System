import { formatHours, formatDate, SUB_COMPONENT_LABELS } from '@/lib/utils';

type Assembly = {
  id: string;
  dateAssembled: Date;
  dateRemoved: Date | null;
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

type AssemblyTableProps = {
  assemblies: Assembly[];
  showActions?: boolean;
  onDisassemble?: (assemblyId: string) => void;
  disassembling?: string | null;
};

export function AssemblyTable({
  assemblies,
  showActions = false,
  onDisassemble,
  disassembling,
}: AssemblyTableProps) {
  const activeAssemblies = assemblies.filter((a) => !a.dateRemoved);
  const pastAssemblies = assemblies.filter((a) => a.dateRemoved);

  return (
    <div className="space-y-6">
      {/* Active assemblies */}
      {activeAssemblies.length > 0 && (
        <div>
          <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Currently Assembled ({activeAssemblies.length})
          </h4>
          <div className="space-y-2">
            {activeAssemblies.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                    ◎
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {SUB_COMPONENT_LABELS[a.subComponent.type as keyof typeof SUB_COMPONENT_LABELS] || a.subComponent.type}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">{a.subComponent.serialNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Lifetime</p>
                    <p className="text-sm font-semibold text-amber-400">{formatHours(a.subComponent.cumulativeHours)} hrs</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Installed</p>
                    <p className="text-xs text-slate-400">{formatDate(a.dateAssembled)}</p>
                  </div>
                  {showActions && onDisassemble && (
                    <button
                      onClick={() => onDisassemble(a.id)}
                      disabled={disassembling === a.id}
                      className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-md px-2.5 py-1.5 transition-colors disabled:opacity-50"
                    >
                      {disassembling === a.id ? '...' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past assemblies */}
      {pastAssemblies.length > 0 && (
        <div>
          <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Past Assemblies ({pastAssemblies.length})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-[var(--border)]">
                  <th className="text-left py-2 pr-4 font-medium">Component</th>
                  <th className="text-left py-2 pr-4 font-medium">Serial</th>
                  <th className="text-left py-2 pr-4 font-medium">Installed</th>
                  <th className="text-left py-2 pr-4 font-medium">Removed</th>
                  <th className="text-right py-2 font-medium">Hours Accrued</th>
                </tr>
              </thead>
              <tbody>
                {pastAssemblies.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 pr-4 text-slate-300">
                      {SUB_COMPONENT_LABELS[a.subComponent.type as keyof typeof SUB_COMPONENT_LABELS] || a.subComponent.type}
                    </td>
                    <td className="py-2 pr-4 text-slate-500 font-mono">{a.subComponent.serialNumber}</td>
                    <td className="py-2 pr-4 text-slate-400">{formatDate(a.dateAssembled)}</td>
                    <td className="py-2 pr-4 text-slate-400">{formatDate(a.dateRemoved)}</td>
                    <td className="py-2 text-right text-amber-400 font-semibold">
                      {a.hoursAccrued != null ? `${formatHours(a.hoursAccrued)} hrs` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {assemblies.length === 0 && (
        <p className="text-sm text-slate-600 text-center py-6">No assembly records</p>
      )}
    </div>
  );
}
