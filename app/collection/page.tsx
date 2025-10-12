import AppLayout from "@/components/layout/AppLayout";
import Grid from "@/components/Grid";
import { getCollectionWithCache } from "@/lib/data";

export default async function CollectionPage() {
  const collection = await getCollectionWithCache();
  
  return (
    <AppLayout activeView="collection">
      <Grid items={collection} />
    </AppLayout>
  );
}
