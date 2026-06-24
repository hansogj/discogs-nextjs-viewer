import AppLayout from "@/components/layout/AppLayout";
import { getCachedCollection, getCachedWantlist } from "@/lib/data";
import StatsDashboard from "@/components/StatsDashboard";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const [collection, wantlist] = await Promise.all([
    getCachedCollection(),
    getCachedWantlist(),
  ]);

  return (
    <AppLayout activeView="stats">
      <StatsDashboard collection={collection} wantlist={wantlist} />
    </AppLayout>
  );
}
