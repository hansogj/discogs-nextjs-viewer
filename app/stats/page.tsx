import AppLayout from "@/components/layout/AppLayout";
import { getCollectionStats } from "@/lib/data";
import StatsDashboard from "@/components/StatsDashboard";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const stats = await getCollectionStats();

  return (
    <AppLayout activeView="stats">
      <StatsDashboard stats={stats} />
    </AppLayout>
  );
}
