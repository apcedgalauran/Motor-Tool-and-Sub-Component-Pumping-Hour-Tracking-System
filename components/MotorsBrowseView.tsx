import { MotorCard } from '@/components/MotorCard';

type Motor = {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
  location: string | null;
  _count: { assemblies: number };
  sapId?: string | null;
  assetType?: string | null;
  size?: string | null;
  brandType?: string | null;
};

/** Pure presentational component — receives an already-filtered/paginated slice. */
export function MotorsBrowseView({ motors }: { motors: Motor[] }) {
  if (motors.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {motors.map((motor, i) => (
        <div key={motor.id} className={`animate-fade-in stagger-${Math.min(i + 1, 6)}`}>
          <MotorCard
            id={motor.id}
            name={motor.name}
            serialNumber={motor.serialNumber}
            status={motor.status}
            location={motor.location}
            assembledCount={motor._count.assemblies}
            sapId={motor.sapId}
            size={motor.size}
            brandType={motor.brandType}
          />
        </div>
      ))}
    </div>
  );
}
