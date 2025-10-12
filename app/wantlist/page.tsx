import AppLayout from "@/components/layout/AppLayout";
import { getInitialWantlist, getHeaderData } from "@/lib/data";
import AlbumViewer from "@/components/AlbumViewer";

export default async function WantlistPage() {
  // Fetch initial wantlist for infinite scroll and full collection for filtering
  const [
    { data: initialWantlist, pagination },
    { fullCollectionForDuplicates: collection }
  ] = await Promise.all([
    getInitialWantlist(),
    getHeaderData(), // This provides the full collection for the filter
  ]);

  return (
    <AppLayout activeView="wantlist">
      <AlbumViewer 
        initialItems={initialWantlist}
        initialPagination={pagination} 
        collectionItemsForFiltering={collection} 
        viewType="wantlist" 
      />
    </AppLayout>
  );
}