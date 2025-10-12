import AppLayout from "@/components/layout/AppLayout";
import GridSkeleton from "@/components/GridSkeleton";

export default function Loading() {
  return (
    <AppLayout activeView="duplicates">
        <div className="p-4">
            <div className="h-8 w-1/3 bg-discogs-border rounded-md mb-6 animate-pulse"></div>
            <GridSkeleton />
        </div>
    </AppLayout>
  );
}
