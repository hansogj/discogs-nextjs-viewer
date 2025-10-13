import { HeaderSkeleton } from '@/components/layout/Header';
import { getHeaderData } from '@/lib/data';
import React, { Suspense } from 'react';
import AppContainer from './AppContainer';

type AppLayoutProps = {
  children: React.ReactNode;
  activeView: 'collection' | 'wantlist' | 'duplicates' | 'user';
};

async function AppLayoutContent({ activeView, children }: AppLayoutProps) {
  const { user, collectionCount, wantlistCount, duplicatesCount } =
    await getHeaderData();

  return (
    // FIX: Pass children to AppContainer to satisfy the AppContainerProps type, which requires the 'children' property.
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
      <Suspense fallback={<HeaderSkeleton activeView={activeView} />}>
        {/* FIX: Pass children to AppLayoutContent to satisfy the AppLayoutProps type, which requires the 'children' property. */}
        <AppLayoutContent activeView={activeView}>{children}</AppLayoutContent>
      </Suspense>
    </div>
  );
}
