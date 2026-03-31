import { getMotor } from '@/actions/motor.actions';
import { HoursForm } from '@/components/HoursForm';
import { MotorDetailClient } from './MotorDetailClient';
import { MOTOR_STATUS_LABELS, formatHours, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MotorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const motor = await getMotor(id);
  if (!motor) notFound();

  const activeAssemblies = motor.assemblies.filter((a: any) => !a.dateRemoved);

  const statusMap: Record<string, string> = {
    ACTIVE: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30',
    INACTIVE: 'text-[#555555] bg-[#333333]/10 border-[#333333]/30',
    IN_MAINTENANCE: 'text-orange-600 bg-orange-500/10 border-orange-500/30',
  };

  const statusColor = statusMap[motor.status] || 'text-[#A3A3A3] bg-[#A3A3A3]/10 border-[#A3A3A3]/30';

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/motors" className="text-xs text-[#333333] hover:text-[#121212] transition-colors">
          ← Back to Motors
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 md:mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
            <h1 className="text-2xl font-bold text-[#121212] tracking-tight">{motor.name}</h1>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border font-semibold whitespace-nowrap ${statusColor}`}>
              {MOTOR_STATUS_LABELS[motor.status] || motor.status}
            </span>
          </div>
          <p className="text-sm text-[#333333] font-mono">{motor.serialNumber}</p>
          {motor.location && <p className="text-xs text-[#333333] mt-1">{motor.location}</p>}
        </div>
        <Link
          href={`/motors/${id}/assemble`}
          className="w-full md:w-auto text-center bg-[#9E9EB0] text-white border border-transparent text-sm px-4 py-3 md:py-2.5 rounded-lg hover:bg-[#85859a] transition-colors"
        >
          + Assemble Sub-Component
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 md:mb-8 animate-fade-in stagger-1">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 md:p-4">
          <p className="text-[10px] text-[#333333] uppercase tracking-wider mb-1">Pumping Hours</p>
          <p className="text-2xl font-bold text-[#121212] tracking-tight">{formatHours(motor.pumpingHours)}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 md:p-4">
          <p className="text-[10px] text-[#333333] uppercase tracking-wider mb-1">Assembled Parts</p>
          <p className="text-2xl font-bold text-[#333333] tracking-tight">{activeAssemblies.length}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 md:p-4">
          <p className="text-[10px] text-[#333333] uppercase tracking-wider mb-1">Date Out</p>
          <p className="text-sm font-medium text-[#333333]">{formatDate(motor.dateOut)}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 md:p-4">
          <p className="text-[10px] text-[#333333] uppercase tracking-wider mb-1">Date In</p>
          <p className="text-sm font-medium text-[#333333]">{formatDate(motor.dateIn)}</p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Log hours + Assemblies */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assemblies */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#121212] mb-4">Sub-Components</h3>
            <MotorDetailClient
              motorId={motor.id}
              assemblies={JSON.parse(JSON.stringify(motor.assemblies))}
            />
          </div>

          {/* Hour Log History */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#121212] mb-4">Hour Log History</h3>
            {motor.hourLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#333333] border-b border-[var(--border)]">
                      <th className="text-left py-2 pr-4 font-medium">Date</th>
                      <th className="text-right py-2 pr-4 font-medium">Added</th>
                      <th className="text-right py-2 pr-4 font-medium">Total After</th>
                      <th className="text-left py-2 pr-4 font-medium">Rig</th>
                      <th className="text-left py-2 pr-4 font-medium">Well</th>
                      <th className="text-left py-2 pr-4 font-medium">Logged By</th>
                      <th className="text-left py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {motor.hourLogs.map((log: any) => (
                      <tr key={log.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-2 pr-4 text-[#333333]">{formatDate(log.createdAt)}</td>
                        <td className="py-2 pr-4 text-right text-[#121212] font-semibold">+{formatHours(log.hoursAdded)}</td>
                        <td className="py-2 pr-4 text-right text-[#333333]">{formatHours(log.totalAfter)}</td>
                        <td className="py-2 pr-4 text-[#333333]">{log.rigName || '—'}</td>
                        <td className="py-2 pr-4 text-[#333333]">{log.wellNumber || '—'}</td>
                        <td className="py-2 pr-4 text-[#333333]">{log.user?.name || '—'}</td>
                        <td className="py-2 text-[#333333]">{log.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[#333333] text-center py-6">No hours logged yet</p>
            )}
          </div>
        </div>

        {/* Right: Add hours form */}
        <div>
          <HoursForm motorId={motor.id} motorName={motor.name} currentHours={motor.pumpingHours} />
        </div>
      </div>
    </div>
  );
}
