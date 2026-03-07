import { getSubComponent } from '@/actions/subcomponent.actions';
import { SUB_COMPONENT_LABELS, formatHours, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SubComponentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sc = await getSubComponent(id);
  if (!sc) notFound();

  const label = SUB_COMPONENT_LABELS[sc.type as keyof typeof SUB_COMPONENT_LABELS] || sc.type;
  const activeAssembly = sc.assemblies.find((a) => !a.dateRemoved);
  const pastAssemblies = sc.assemblies.filter((a) => a.dateRemoved);
  const isInstalled = !!activeAssembly;

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/sub-components" className="text-xs text-[#333333] hover:text-[#121212] transition-colors">
          ← Back to Sub-Components
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-[#121212] tracking-tight">{label}</h1>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border font-semibold ${isInstalled
              ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30'
              : 'text-[#333333] bg-[#A3A3A3]/10 border-[#A3A3A3]/30'
              }`}>
              {isInstalled ? 'Installed' : 'Available'}
            </span>
          </div>
          <p className="text-sm text-[#333333] font-mono">{sc.serialNumber}</p>
          {sc.notes && <p className="text-xs text-[#333333] mt-1">{sc.notes}</p>}
        </div>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8 animate-fade-in stagger-1">
        <div className="bg-[var(--card)] border border-[#9E9EB0]/30 rounded-xl p-5">
          <p className="text-[10px] text-[#333333] uppercase tracking-wider mb-1">Lifetime Hours</p>
          <p className="text-3xl font-bold text-[#121212] tracking-tight">{formatHours(sc.cumulativeHours)}</p>
          <p className="text-[10px] text-[#333333] mt-1">across all motors</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <p className="text-[10px] text-[#333333] uppercase tracking-wider mb-1">Total Assignments</p>
          <p className="text-2xl font-bold text-[#333333] tracking-tight">{sc.assemblies.length}</p>
        </div>
        {activeAssembly && (
          <div className="bg-[var(--card)] border border-emerald-500/20 rounded-xl p-5">
            <p className="text-[10px] text-[#333333] uppercase tracking-wider mb-1">Current Motor</p>
            <Link
              href={`/motors/${activeAssembly.motor.id}`}
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {activeAssembly.motor.name}
            </Link>
            <p className="text-[10px] text-[#333333] mt-0.5">
              since {formatDate(activeAssembly.dateAssembled)}
            </p>
          </div>
        )}
      </div>

      {/* Assembly History */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#121212] mb-4">Assembly History</h3>

        {sc.assemblies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#333333] border-b border-[var(--border)]">
                  <th className="text-left py-2 pr-4 font-medium">Motor</th>
                  <th className="text-left py-2 pr-4 font-medium">Serial</th>
                  <th className="text-left py-2 pr-4 font-medium">Installed</th>
                  <th className="text-left py-2 pr-4 font-medium">Removed</th>
                  <th className="text-right py-2 pr-4 font-medium">Hrs at Install</th>
                  <th className="text-right py-2 pr-4 font-medium">Hrs at Removal</th>
                  <th className="text-right py-2 font-medium">Accrued</th>
                </tr>
              </thead>
              <tbody>
                {sc.assemblies.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/motors/${a.motor.id}`}
                        className="text-[#333333] hover:text-[#9E9EB0] transition-colors"
                      >
                        {a.motor.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-[#333333] font-mono">{a.motor.serialNumber}</td>
                    <td className="py-2 pr-4 text-[#333333]">{formatDate(a.dateAssembled)}</td>
                    <td className="py-2 pr-4 text-[#333333]">
                      {a.dateRemoved ? formatDate(a.dateRemoved) : (
                        <span className="text-emerald-600">Active</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right text-[#333333]">{formatHours(a.hoursAtAssembly)}</td>
                    <td className="py-2 pr-4 text-right text-[#333333]">
                      {a.hoursAtRemoval != null ? formatHours(a.hoursAtRemoval) : '—'}
                    </td>
                    <td className="py-2 text-right text-[#121212] font-semibold">
                      {a.hoursAccrued != null ? `${formatHours(a.hoursAccrued)} hrs` : (
                        <span className="text-emerald-600 font-normal">Running</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[#333333] text-center py-6">No assembly history</p>
        )}
      </div>
    </div>
  );
}
