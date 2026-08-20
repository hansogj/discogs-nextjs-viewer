import AppLayout from "@/components/layout/AppLayout";
import {
  getCachedWantlist,
  getCachedCollection,
  getCachedWantlistPrices,
} from "@/lib/data";
import ProgressiveLoader from "@/components/ProgressiveLoader";

export const dynamic = "force-dynamic"; // Ensures data is fetched from cache on every request

export default async function WantlistPage() {
  const [wantlist, collection, wantlistPrices] = await Promise.all([
    getCachedWantlist(),
    getCachedCollection(),
    getCachedWantlistPrices(),
  ]);

  return (
    <AppLayout activeView="wantlist">
      <ProgressiveLoader
        initialItems={wantlist}
        viewType="wantlist"
        collectionItemsForFiltering={collection}
        folders={[]}
        customFields={[]}
        wantlistPrices={wantlistPrices}
      />
    </AppLayout>
  );
}
