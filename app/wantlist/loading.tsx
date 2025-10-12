import AppLayout from "@/components/layout/AppLayout";
import GridSkeleton from "@/components/GridSkeleton";

export default function Loading() {
  return (
    <AppLayout activeView="wantlist">
      <GridSkeleton />
    </AppLayout>
  );
}