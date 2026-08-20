import AppLayout from "@/components/layout/AppLayout";
import {
  getCachedCollection,
  getCachedFolders,
  getCachedCustomFields,
} from "@/lib/data";
import ProgressiveLoader from "@/components/ProgressiveLoader";

export const dynamic = "force-dynamic"; // Ensures data is fetched from cache on every request

export default async function CollectionPage() {
  const [collection, folders, customFields] = await Promise.all([
    getCachedCollection(),
    getCachedFolders(),
    getCachedCustomFields(),
  ]);

  return (
    <AppLayout activeView="collection">
      <ProgressiveLoader
        initialItems={collection}
        viewType="collection"
        folders={folders}
        customFields={customFields}
      />
    </AppLayout>
  );
}
