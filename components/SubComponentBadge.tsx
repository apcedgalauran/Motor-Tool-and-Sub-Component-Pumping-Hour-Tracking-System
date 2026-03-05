import { SUB_COMPONENT_LABELS } from '@/lib/utils';

type SubComponentBadgeProps = {
  type: string;
  serialNumber: string;
  cumulativeHours: number;
  status: string;
  compact?: boolean;
};

export function SubComponentBadge({ type, serialNumber, cumulativeHours, status, compact }: SubComponentBadgeProps) {
  const isInstalled = status === 'INSTALLED';
  const borderColor = isInstalled ? 'border-emerald-500/30' : 'border-[var(--border)]';
  const label = SUB_COMPONENT_LABELS[type as keyof typeof SUB_COMPONENT_LABELS] || type;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${borderColor} bg-[var(--background)]`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isInstalled ? 'bg-emerald-500' : 'bg-slate-500'}`} />
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-500 font-mono">{serialNumber}</span>
      </span>
    );
  }

  return (
    <div className={`bg-[var(--card)] border ${borderColor} rounded-lg px-4 py-3 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <div className={`w-2 h-8 rounded-full ${isInstalled ? 'bg-emerald-500' : 'bg-slate-600'}`} />
        <div>
          <p className="text-sm font-medium text-slate-200">{label}</p>
          <p className="text-xs text-slate-500 font-mono">{serialNumber}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-amber-400">{cumulativeHours.toFixed(1)} hrs</p>
        <p className={`text-[10px] uppercase tracking-wider ${isInstalled ? 'text-emerald-500' : 'text-slate-500'}`}>
          {isInstalled ? 'Installed' : 'Available'}
        </p>
      </div>
    </div>
  );
}
