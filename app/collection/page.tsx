import AppLayout from '@/components/layout/AppLayout';
import { getInitialCollection } from '@/lib/data';
import AlbumViewer from '@/components/AlbumViewer';
import type { Pagination } from '@/lib/types';

export default async function CollectionPage() {
  const { data: initialCollection, pagination } = await getInitialCollection();

  return (
    <AppLayout activeView="collection">
      <AlbumViewer
        initialItems={initialCollection}
        initialPagination={pagination}
        viewType="collection"
      />
    </AppLayout>
  );
}
