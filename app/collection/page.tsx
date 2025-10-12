import AppLayout from "@/components/layout/AppLayout";
import { getCollectionWithCache } from "@/lib/data";
import AlbumViewer from "@/components/AlbumViewer";

export default async function CollectionPage() {
  const collection = await getCollectionWithCache();
  
  return (
    <AppLayout activeView="collection">
      <AlbumViewer items={collection} viewType="collection" />
    </AppLayout>
  );
}
