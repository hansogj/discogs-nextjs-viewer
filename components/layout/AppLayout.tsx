import { HeaderSkeleton } from '@/components/layout/Header';
import { getHeaderData } from '@/lib/data';
import React, { Suspense } from 'react';
import AppContainer from './AppContainer';

type AppLayoutProps = {
  children: React.ReactNode;
  activeView: 'collection' | 'wantlist' | 'duplicates';
};

async function AppLayoutContent({ activeView, children }: AppLayoutProps) {
  const { user, collectionCount, wantlistCount, duplicatesCount } =
    await getHeaderData();

  return (
    // FIX: Pass children to AppContainer to satisfy AppContainerProps type
    <AppContainer
      user={user}
      activeView={activeView}
      collectionCount={collectionCount}
      wantlistCount={wantlistCount}
      duplicatesCount={duplicatesCount}
    >
      {children}
    </AppContainer>
  );
}

export default function AppLayout({ children, activeView }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-discogs-bg text-discogs-text">
      {/* FIX: Pass children to AppLayoutContent to satisfy AppLayoutProps type */}
      <Suspense fallback={<HeaderSkeleton activeView={activeView} />}>
        <AppLayoutContent activeView={activeView}>{children}</AppLayoutContent>
      </Suspense>
    </div>
  );
}
