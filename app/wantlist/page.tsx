import AppLayout from "@/components/layout/AppLayout";
import Grid from "@/components/Grid";
import { getWantlistWithCache } from "@/lib/data";

export default async function WantlistPage() {
  const wantlist = await getWantlistWithCache();

  return (
    <AppLayout activeView="wantlist">
      <Grid items={wantlist} />
    </AppLayout>
  );
}
