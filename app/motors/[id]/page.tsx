import { getMotor } from '@/actions/motor.actions';
import { HoursForm } from '@/components/HoursForm';
import { AssemblyTable } from '@/components/AssemblyTable';
import { MotorDetailClient } from './MotorDetailClient';
import { MOTOR_STATUS_LABELS, formatHours, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MotorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const motor = await getMotor(id);
  if (!motor) notFound();

  const activeAssemblies = motor.assemblies.filter((a) => !a.dateRemoved);

  const statusColor = {
    ACTIVE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    INACTIVE: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
    IN_MAINTENANCE: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  }[motor.status] || 'text-slate-400 bg-slate-500/10 border-slate-500/30';

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/motors" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
          ← Back to Motors
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{motor.name}</h1>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border font-semibold ${statusColor}`}>
              {MOTOR_STATUS_LABELS[motor.status] || motor.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-mono">{motor.serialNumber}</p>
          {motor.location && <p className="text-xs text-slate-500 mt-1">{motor.location}</p>}
        </div>
        <Link
          href={`/motors/${id}/assemble`}
          className="inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-sm px-4 py-2 rounded-lg hover:bg-emerald-500/20 transition-colors"
        >
          + Assemble Sub-Component
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 animate-fade-in stagger-1">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Pumping Hours</p>
          <p className="text-2xl font-bold text-amber-400 tracking-tight">{formatHours(motor.pumpingHours)}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Assembled Parts</p>
          <p className="text-2xl font-bold text-slate-200 tracking-tight">{activeAssemblies.length}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Date Out</p>
          <p className="text-sm font-medium text-slate-300">{formatDate(motor.dateOut)}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Date In</p>
          <p className="text-sm font-medium text-slate-300">{formatDate(motor.dateIn)}</p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Log hours + Assemblies */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assemblies */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Sub-Components</h3>
            <MotorDetailClient
              assemblies={JSON.parse(JSON.stringify(motor.assemblies))}
            />
          </div>

          {/* Hour Log History */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Hour Log History</h3>
            {motor.hourLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-[var(--border)]">
                      <th className="text-left py-2 pr-4 font-medium">Date</th>
                      <th className="text-right py-2 pr-4 font-medium">Added</th>
                      <th className="text-right py-2 pr-4 font-medium">Total After</th>
                      <th className="text-left py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {motor.hourLogs.map((log) => (
                      <tr key={log.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-2 pr-4 text-slate-400">{formatDate(log.createdAt)}</td>
                        <td className="py-2 pr-4 text-right text-amber-400 font-semibold">+{formatHours(log.hoursAdded)}</td>
                        <td className="py-2 pr-4 text-right text-slate-300">{formatHours(log.totalAfter)}</td>
                        <td className="py-2 text-slate-500">{log.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-600 text-center py-6">No hours logged yet</p>
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
