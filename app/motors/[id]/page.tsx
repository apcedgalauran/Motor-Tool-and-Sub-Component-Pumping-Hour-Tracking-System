import { getMotor } from '@/actions/motor.actions';
import { HoursForm } from '@/components/HoursForm';
import { MotorEditHistorySection } from '@/components/MotorEditHistorySection';
import { MotorInlineEditor } from '@/components/MotorInlineEditor';
import { MotorDetailClient } from './MotorDetailClient';
import { formatHours, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

function toDateInputValue(value: Date | string | null): string | null {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString().slice(0, 10);
}

export default async function MotorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const motor = await getMotor(id);
  if (!motor) notFound();

  const activeAssemblies = motor.assemblies.filter((a) => !a.dateRemoved);

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/motors"
          className="inline-flex items-center gap-2 text-sm md:text-base font-semibold text-[#333333] hover:text-[#121212] border border-[var(--border)] rounded-lg px-3 py-2 hover:bg-[var(--card-hover)] transition-colors"
        >
          ← Back to Motors
        </Link>
      </div>

      <MotorInlineEditor
        initialMotor={{
          id: motor.id,
          name: motor.name,
          serialNumber: motor.serialNumber,
          location: motor.location,
          dateOut: toDateInputValue(motor.dateOut),
          dateIn: toDateInputValue(motor.dateIn),
          status: motor.status,
          customStatusId: motor.customStatusId,
          customStatusColor: motor.customStatus?.color ?? null,
          pumpingHours: motor.pumpingHours,
        }}
        activeAssembliesCount={activeAssemblies.length}
      />

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
                    {motor.hourLogs.map((log) => (
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

          <MotorEditHistorySection editLogs={motor.editLogs} />
        </div>

        {/* Right: Add hours form */}
        <div>
          <HoursForm motorId={motor.id} motorName={motor.name} currentHours={motor.pumpingHours} />
        </div>
      </div>
    </div>
  );
}
