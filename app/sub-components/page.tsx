import { getSubComponents } from '@/actions/subcomponent.actions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SubComponentsPage() {
  const subComponents = await getSubComponents();

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-[#121212] tracking-tight">Sub-Components</h1>
          <p className="text-sm text-[#333333] mt-1">{subComponents.length} component{subComponents.length !== 1 ? 's' : ''} registered</p>
        </div>
        <Link
          href="/sub-components/new"
          className="w-full md:w-auto text-center bg-[#9E9EB0] hover:bg-[#8A8A9F] text-white font-semibold text-sm px-4 py-3 md:py-2.5 rounded-lg transition-all duration-200"
        >
          + New Component
        </Link>
      </div>

      {subComponents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {subComponents.map((sc, i) => {
            const currentMotor = sc.assemblies[0]?.motor;
            return (
              <Link
                key={sc.id}
                href={`/sub-components/${sc.id}`}
                className={`block hover:ring-1 hover:ring-[#9E9EB0]/30 rounded-lg transition-all animate-fade-in stagger-${Math.min(i + 1, 6)}`}
              >
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3 flex items-center justify-between hover:border-[#9E9EB0]/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-8 rounded-full ${sc.status === 'INSTALLED' ? 'bg-emerald-500' : 'bg-[#A3A3A3]'}`} />
                    <div>
                      <p className="text-sm font-medium text-[#333333]">
                        {sc.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </p>
                      <p className="text-xs text-[#333333] font-mono">{sc.serialNumber}</p>
                      {currentMotor && (
                        <p className="text-[10px] text-emerald-600 mt-0.5">
                          Installed in {currentMotor.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#121212]">{sc.cumulativeHours.toFixed(1)} hrs</p>
                    <p className={`text-[10px] uppercase tracking-wider ${sc.status === 'INSTALLED' ? 'text-emerald-600' : 'text-[#333333]'}`}>
                      {sc.status === 'INSTALLED' ? 'Installed' : 'Available'}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 animate-fade-in">
          <div className="text-4xl mb-4 opacity-30">◎</div>
          <p className="text-[#333333] text-sm mb-4">No sub-components registered</p>
          <Link
            href="/sub-components/new"
            className="inline-block bg-[#9E9EB0]/10 text-[#9E9EB0] border border-[#9E9EB0]/30 text-sm px-4 py-2 rounded-lg hover:bg-[#9E9EB0]/20 transition-colors"
          >
            Add your first component
          </Link>
        </div>
      )}
    </div>
  );
}
