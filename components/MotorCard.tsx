import Link from 'next/link';
import { MOTOR_STATUS_LABELS, formatHours } from '@/lib/utils';

type MotorCardProps = {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
  location: string | null;
  pumpingHours: number;
  assembledCount: number;
};

export function MotorCard({
  id,
  name,
  serialNumber,
  status,
  location,
  pumpingHours,
  assembledCount,
}: MotorCardProps) {
  const statusColor = {
    ACTIVE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    INACTIVE: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
    IN_MAINTENANCE: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  }[status] || 'text-slate-400 bg-slate-500/10 border-slate-500/30';

  return (
    <Link
      href={`/motors/${id}`}
      className="group block bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:border-amber-500/30 hover:bg-[var(--card-hover)] transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 group-hover:text-amber-400 transition-colors">
            {name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">{serialNumber}</p>
        </div>
        <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border font-semibold ${statusColor}`}>
          {MOTOR_STATUS_LABELS[status] || status}
        </span>
      </div>

      {/* Hours display */}
      <div className="mb-4">
        <div className="text-2xl font-bold text-amber-400 tracking-tight">
          {formatHours(pumpingHours)}
          <span className="text-xs text-slate-500 font-normal ml-1.5">hrs</span>
        </div>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-[var(--border)]">
        <span>{location || 'No location'}</span>
        <span className="flex items-center gap-1">
          <span className="text-slate-400">◎</span>
          {assembledCount} parts
        </span>
      </div>
    </Link>
  );
}
