import Header from "@/components/layout/Header";
import { getCollectionWithCache, getWantlistWithCache } from "@/lib/data";
import { getSession } from "@/lib/session";
import { Suspense } from "react";
import GridSkeleton from "../GridSkeleton";

type AppLayoutProps = {
  children: React.ReactNode;
  activeView: 'collection' | 'wantlist';
};

// This component fetches data required by the Header
async function HeaderDataFetcher({ activeView }: { activeView: 'collection' | 'wantlist' }) {
  const session = await getSession();
  const user = session.user;

  if (!user) {
    // This should not happen due to middleware, but as a safeguard:
    return <header className="bg-discogs-bg-light p-4 shadow-lg border-b border-discogs-border" />;
  }
  
  // We can fetch counts in parallel
  const [collection, wantlist] = await Promise.all([
    getCollectionWithCache(),
    getWantlistWithCache(),
  ]);

  return (
    <Header 
      user={user} 
      activeView={activeView}
      collectionCount={collection.length}
      wantlistCount={wantlist.length}
    />
  );
}

export default function AppLayout({ children, activeView }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-discogs-bg text-discogs-text">
      <Suspense fallback={<Header.Skeleton activeView={activeView} />}>
        <HeaderDataFetcher activeView={activeView} />
      </Suspense>
      <main className="container mx-auto">
        {children}
      </main>
    </div>
  );
}
