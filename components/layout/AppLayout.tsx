import { HeaderSkeleton } from "@/components/layout/Header";
import { getHeaderData } from "@/lib/data";
import { getSession } from "@/lib/session";
// FIX: Import React to resolve 'Cannot find namespace' error for React.ReactNode. This also fixes cascading errors in pages using this layout.
import React, { Suspense } from "react";
import Header from "./Header";

type AppLayoutProps = {
  children: React.ReactNode;
  activeView: 'collection' | 'wantlist' | 'duplicates';
};

// This component fetches data required by the Header
async function HeaderDataFetcher({ activeView }: { activeView: 'collection' | 'wantlist' | 'duplicates' }) {
  const session = await getSession();
  const user = session.user;

  if (!user) {
    // This should not happen due to middleware, but as a safeguard:
    return <header className="bg-discogs-bg-light p-4 shadow-lg border-b border-discogs-border" />;
  }
  
  const { collectionCount, wantlistCount, duplicatesCount } = await getHeaderData();

  return (
    <Header 
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
    <div className="min-h-screen bg-discogs-bg text-discogs-text">
      <Suspense fallback={<HeaderSkeleton activeView={activeView} />}>
        <HeaderDataFetcher activeView={activeView} />
      </Suspense>
      <main className="container mx-auto">
        {children}
      </main>
    </div>
  );
}