import { getMotors } from '@/actions/motor.actions';
import { getCustomStatuses } from '@/actions/custom-status.actions';
import { MotorCard } from '@/components/MotorCard';
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

      {/* Stats grid — 3 cards (Total Hours removed) */}
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

      {/* Motors Grid */}
      {motors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {motors.map((motor, i) => (
            <div key={motor.id} className={`animate-fade-in stagger-${Math.min(i + 1, 6)}`}>
              <MotorCard
                id={motor.id}
                name={motor.name}
                serialNumber={motor.serialNumber}
                status={motor.status}
                statusColor={motor.customStatus?.color}
                location={motor.location}
                pumpingHours={motor.pumpingHours}
                assembledCount={motor._count.assemblies}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 animate-fade-in">
          <div className="text-4xl mb-4 opacity-30">⚙</div>
          <p className="text-[#333333] text-sm mb-4">No motors yet</p>
          <Link
            href="/motors/new"
            className="inline-block bg-[#9E9EB0]/10 text-[#9E9EB0] border border-[#9E9EB0]/30 text-sm px-4 py-3 rounded-lg hover:bg-[#9E9EB0]/20 transition-colors"
          >
            Add your first motor
          </Link>
        </div>
      )}
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
