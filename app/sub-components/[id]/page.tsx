import { getSubComponent } from '@/actions/subcomponent.actions';
import { notFound } from 'next/navigation';
import { SubComponentDetailClient } from './SubComponentDetailClient';

export const dynamic = 'force-dynamic';

export default async function SubComponentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sc = await getSubComponent(id);
  if (!sc) notFound();

  return (
    <div className="w-full min-w-0 max-w-[100vw] overflow-x-hidden">
      <SubComponentDetailClient initialSubComponent={JSON.parse(JSON.stringify(sc))} />
    </div>
  );
}
