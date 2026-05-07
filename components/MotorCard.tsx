import Link from 'next/link';
import { ASSET_STATUS_META, type AssetStatus } from '@/lib/asset-status';

type MotorCardProps = {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
  location: string | null;
  assembledCount: number;
  sapId?: string | null;
  size?: string | null;
  brandType?: string | null;
};

export function MotorCard({
  id,
  name,
  serialNumber,
  status,
  location,
  assembledCount,
  sapId,
  size,
  brandType,
}: MotorCardProps) {
  const meta = status in ASSET_STATUS_META
    ? ASSET_STATUS_META[status as AssetStatus]
    : { code: '?', label: status, color: '#9E9EB0', textColor: '#ffffff' };

  return (
    <Link
      href={`/motors/${id}`}
      className="group block bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:border-[#9E9EB0] hover:bg-[var(--card-hover)] transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[#121212] group-hover:text-[#9E9EB0] transition-colors font-mono">
            {serialNumber}
          </h3>
          <p className="text-xs text-[#333333] mt-0.5">{name}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-semibold">
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold leading-none flex-shrink-0"
            style={{ backgroundColor: meta.color, color: meta.textColor }}
          >
            {meta.code}
          </span>
          <span className="text-[#333333]">{meta.label}</span>
        </span>
      </div>

      {/* Specs line */}
      {(sapId || size || brandType) && (
        <p className="text-[10px] text-[#A3A3A3] truncate mb-3">
          {[sapId, size, brandType].filter(Boolean).join(' · ')}
        </p>
      )}

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
