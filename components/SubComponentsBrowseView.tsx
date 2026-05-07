import Link from 'next/link';

type SubComponent = {
  id: string;
  type: string;
  serialNumber: string;
  cumulativeHours: number;
  currentMotorName: string | null;
  isInstalled: boolean;
};

/** Pure presentational component — receives an already-filtered/paginated slice. */
export function SubComponentsBrowseView({
  subComponents,
}: {
  subComponents: SubComponent[];
}) {
  if (subComponents.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {subComponents.map((sc, i) => (
        <Link
          key={sc.id}
          href={`/sub-components/${sc.id}`}
          className={`block hover:ring-1 hover:ring-[#9E9EB0]/30 rounded-lg transition-all animate-fade-in stagger-${Math.min(i + 1, 6)}`}
        >
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-[#9E9EB0]/30 transition-colors">
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-8 rounded-full ${sc.isInstalled ? 'bg-emerald-500' : 'bg-[#A3A3A3]'}`}
              />
              <div>
                <p className="text-sm font-medium text-[#333333]">
                  {sc.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </p>
                <p className="text-xs text-[#333333] font-mono">{sc.serialNumber}</p>
                {sc.currentMotorName && (
                  <p className="text-[10px] text-emerald-700 mt-0.5">
                    Installed in {sc.currentMotorName}
                  </p>
                )}
              </div>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto">
              <p className="text-sm font-semibold text-[#121212]">
                {sc.cumulativeHours.toFixed(1)} hrs
              </p>
              <p
                className={`text-[10px] uppercase tracking-wider ${sc.isInstalled ? 'text-emerald-700' : 'text-[#333333]'}`}
              >
                {sc.isInstalled ? 'Installed' : 'Available'}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
