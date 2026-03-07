import { getMotors } from '@/actions/motor.actions';
import { MotorCard } from '@/components/MotorCard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function MotorsPage() {
  const motors = await getMotors();

  return (
    <div>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-[#121212] tracking-tight">Motors</h1>
          <p className="text-sm text-[#333333] mt-1">{motors.length} motor{motors.length !== 1 ? 's' : ''} registered</p>
        </div>
        <Link
          href="/motors/new"
          className="bg-[#9E9EB0] hover:bg-[#8A8A9F] text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-all duration-200"
        >
          + New Motor
        </Link>
      </div>

      {motors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {motors.map((motor, i) => (
            <div key={motor.id} className={`animate-fade-in stagger-${Math.min(i + 1, 6)}`}>
              <MotorCard
                id={motor.id}
                name={motor.name}
                serialNumber={motor.serialNumber}
                status={motor.status}
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
          <p className="text-[#333333] text-sm mb-4">No motors registered</p>
          <Link
            href="/motors/new"
            className="inline-block bg-[#9E9EB0]/10 text-[#9E9EB0] border border-[#9E9EB0]/30 text-sm px-4 py-2 rounded-lg hover:bg-[#9E9EB0]/20 transition-colors"
          >
            Add your first motor
          </Link>
        </div>
      )}
    </div>
  );
}
