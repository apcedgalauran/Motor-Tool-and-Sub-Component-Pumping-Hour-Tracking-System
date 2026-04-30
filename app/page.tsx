import { getMotors } from '@/actions/motor.actions';
import { getCustomStatuses } from '@/actions/custom-status.actions';
import { SerialNumberSearch } from '@/components/SerialNumberSearch';
import {
  STANDARD_MOTOR_STATUSES,
  MOTOR_STATUS_LABELS,
  MOTOR_STATUS_COLORS,
} from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [motors, customStatuses] = await Promise.all([
    getMotors(),
    getCustomStatuses(),
  ]);

  const totalMotors = motors.length;
  const onLocationMotors = motors.filter((m) => m.status === 'ON_LOCATION').length;
  const totalParts = motors.reduce((sum, m) => sum + m._count.assemblies, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-[#121212] tracking-tight">Dashboard</h1>
          <p className="text-sm text-[#333333] mt-1">Motor &amp; sub-component overview</p>
        </div>
        <Link
          href="/motors/new"
          className="w-full md:w-auto text-center bg-[#9E9EB0] hover:bg-[#8A8A9F] text-white font-semibold text-sm px-4 py-3 md:py-2.5 rounded-lg transition-all duration-200"
        >
          + New Motor
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 animate-fade-in stagger-1">
        <StatCard label="Total Motors" value={totalMotors.toString()} />
        <StatCard label="On Location" value={onLocationMotors.toString()} />
        <StatCard label="Assembled Parts" value={totalParts.toString()} />
      </div>

      {/* Status Legend */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-8 animate-fade-in stagger-2">
        <p className="text-[10px] text-[#333333] uppercase tracking-wider mb-3 font-medium">Status Legend</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {STANDARD_MOTOR_STATUSES.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: MOTOR_STATUS_COLORS[s] }}
              />
              <span className="text-xs text-[#333333]">{MOTOR_STATUS_LABELS[s]}</span>
            </div>
          ))}
          {customStatuses.map((cs) => (
            <div key={cs.id} className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: cs.color }}
              />
              <span className="text-xs text-[#333333]">{cs.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="animate-fade-in stagger-3">
        <SerialNumberSearch />

        {/* Browse all links */}
        <div className="flex items-center gap-4 mt-4">
          <Link
            href="/motors"
            id="dashboard-browse-motors"
            className="text-xs text-[#9E9EB0] hover:text-[#121212] transition-colors flex items-center gap-1"
          >
            <span className="text-[10px]">⚙</span> Browse all motors
          </Link>
          <span className="text-[#ddd] select-none">·</span>
          <Link
            href="/sub-components"
            id="dashboard-browse-parts"
            className="text-xs text-[#9E9EB0] hover:text-[#121212] transition-colors flex items-center gap-1"
          >
            <span className="text-[10px]">◎</span> Browse all parts
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 md:p-4">
      <p className="text-[10px] text-[#333333] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold tracking-tight text-[#333333]">{value}</p>
    </div>
  );
}
