import { HeaderSkeleton } from "@/components/layout/Header";
import { getHeaderData } from "@/lib/data";
import React, { Suspense } from "react";
import AppContainer from "./AppContainer";
import SyncErrorBanner from "./SyncErrorBanner";
import SyncManager from "./SyncManager";

type ActiveView = "collection" | "wantlist" | "duplicates" | "stats" | "user";

type AppLayoutProps = {
  children: React.ReactNode;
  activeView: ActiveView;
};

async function AppLayoutContent({ activeView }: { activeView: ActiveView }) {
  const { user, collectionCount, wantlistCount, duplicatesCount } =
    await getHeaderData();
  return (
    <AppContainer
      user={user}
      activeView={activeView}
      collectionCount={collectionCount}
      wantlistCount={wantlistCount}
      duplicatesCount={duplicatesCount}
    />
  );
}

export default function AppLayout({ children, activeView }: AppLayoutProps) {
  return (
    <SyncManager>
      <div className="min-h-screen bg-discogs-bg text-discogs-text">
        <Suspense fallback={<HeaderSkeleton activeView={activeView} />}>
          <AppLayoutContent activeView={activeView} />
        </Suspense>
        <main className="container mx-auto">
          <SyncErrorBanner />
          {children}
        </main>
      </div>
    </SyncManager>
  );
}
