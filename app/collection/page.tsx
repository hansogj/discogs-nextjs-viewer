import AppLayout from '@/components/layout/AppLayout';
import { getCachedCollection, getCachedFolders } from '@/lib/data';
import AlbumViewer from '@/components/AlbumViewer';

export const dynamic = 'force-dynamic'; // Ensures data is fetched from cache on every request

export default async function CollectionPage() {
  const [collection, folders] = await Promise.all([
    getCachedCollection(),
    getCachedFolders(),
  ]);

  return (
    <AppLayout activeView="collection">
      <AlbumViewer
        items={collection}
        viewType="collection"
        folders={folders}
      />
    </AppLayout>
  );
}
