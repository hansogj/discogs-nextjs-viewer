import AppLayout from "@/components/layout/AppLayout";
import { getWantlistWithCache } from "@/lib/data";
import AlbumViewer from "@/components/AlbumViewer";

export default async function WantlistPage() {
  const wantlist = await getWantlistWithCache();

  return (
    <AppLayout activeView="wantlist">
      <AlbumViewer items={wantlist} />
    </AppLayout>
  );
}