import AppLayout from "@/components/layout/AppLayout";
import {
  getCachedWantlist,
  getCachedCollection,
  getCachedWantlistPrices,
} from "@/lib/data";
import AlbumViewer from "@/components/AlbumViewer";

export const dynamic = "force-dynamic"; // Ensures data is fetched from cache on every request

export default async function WantlistPage() {
  const [wantlist, collection, wantlistPrices] = await Promise.all([
    getCachedWantlist(),
    getCachedCollection(),
    getCachedWantlistPrices(),
  ]);

  return (
    <AppLayout activeView="wantlist">
      <AlbumViewer
        items={wantlist}
        collectionItemsForFiltering={collection}
        viewType="wantlist"
        folders={[]}
        customFields={[]}
        wantlistPrices={wantlistPrices}
      />
    </AppLayout>
  );
}
