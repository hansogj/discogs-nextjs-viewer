import AppLayout from "@/components/layout/AppLayout";
import { getCollectionWithCache, getWantlistWithCache } from "@/lib/data";
import AlbumViewer from "@/components/AlbumViewer";

export default async function WantlistPage() {
  const [wantlist, collection] = await Promise.all([
    getWantlistWithCache(),
    getCollectionWithCache(),
  ]);

  return (
    <AppLayout activeView="wantlist">
      <AlbumViewer items={wantlist} collectionItemsForFiltering={collection} viewType="wantlist" />
    </AppLayout>
  );
}
