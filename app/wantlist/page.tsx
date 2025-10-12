import AppLayout from '@/components/layout/AppLayout';
import { getCachedWantlist, getCachedCollection } from '@/lib/data';
import AlbumViewer from '@/components/AlbumViewer';

export const dynamic = 'force-dynamic'; // Ensures data is fetched from cache on every request

export default async function WantlistPage() {
  const [wantlist, collection] = await Promise.all([
    getCachedWantlist(),
    getCachedCollection(),
  ]);

  return (
    <AppLayout activeView="wantlist">
      <AlbumViewer
        items={wantlist}
        collectionItemsForFiltering={collection}
        viewType="wantlist"
      />
    </AppLayout>
  );
}
