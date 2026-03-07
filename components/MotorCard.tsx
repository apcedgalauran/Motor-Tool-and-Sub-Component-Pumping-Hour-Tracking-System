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
    ACTIVE: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30',
    INACTIVE: 'text-[#A3A3A3] bg-[#A3A3A3]/10 border-[#A3A3A3]/30',
    IN_MAINTENANCE: 'text-orange-600 bg-orange-500/10 border-orange-500/30',
  }[status] || 'text-[#A3A3A3] bg-[#A3A3A3]/10 border-[#A3A3A3]/30';

  return (
    <Link
      href={`/motors/${id}`}
      className="group block bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:border-[#9E9EB0] hover:bg-[var(--card-hover)] transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[#121212] group-hover:text-[#9E9EB0] transition-colors">
            {name}
          </h3>
          <p className="text-xs text-[#333333] mt-0.5 font-mono">{serialNumber}</p>
        </div>
        <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border font-semibold ${statusColor}`}>
          {MOTOR_STATUS_LABELS[status] || status}
        </span>
      </div>

      {/* Hours display */}
      <div className="mb-4">
        <div className="text-2xl font-bold text-[#121212] tracking-tight">
          {formatHours(pumpingHours)}
          <span className="text-xs text-[#A3A3A3] font-normal ml-1.5">hrs</span>
        </div>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-xs text-[#333333] pt-3 border-t border-[var(--border)]">
        <span>{location || 'No location'}</span>
        <span className="flex items-center gap-1">
          <span className="text-[#333333]">◎</span>
          {assembledCount} parts
        </span>
      </div>
    </Link>
  );
}
