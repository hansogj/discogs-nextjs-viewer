import AppLayout from '@/components/layout/AppLayout';
import React from 'react';

const SkeletonStatCard: React.FC = () => (
  <div className="flex animate-pulse flex-col items-center justify-center rounded-xl bg-discogs-bg p-4">
    <div className="mb-2 h-8 w-8 rounded-md bg-discogs-border"></div>
    <div className="mb-1 h-7 w-12 rounded-md bg-discogs-border"></div>
    <div className="h-3 w-20 rounded-md bg-discogs-border"></div>
  </div>
);

export default function Loading() {
  return (
    // FIX: The `children` prop is correctly passed to AppLayout. The error is likely due to an issue in the AppLayout component itself.
    <AppLayout activeView="user">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <header className="mb-8 flex animate-pulse flex-col items-center gap-6 sm:flex-row">
            <div className="h-32 w-32 flex-shrink-0 rounded-full bg-discogs-border"></div>
            <div className="w-full space-y-3 sm:w-auto">
              <div className="h-10 w-48 rounded-md bg-discogs-border"></div>
              <div className="h-5 w-32 rounded-md bg-discogs-border"></div>
              <div className="h-3 w-40 rounded-md bg-discogs-border"></div>
            </div>
          </header>

          <section className="mb-8 animate-pulse rounded-xl border border-discogs-border bg-discogs-bg-light p-6">
            <div className="mb-4 h-5 w-24 rounded-md bg-discogs-border"></div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded-md bg-discogs-border"></div>
              <div className="h-4 w-5/6 rounded-md bg-discogs-border"></div>
              <div className="h-4 w-3/4 rounded-md bg-discogs-border"></div>
            </div>
          </section>

          <section>
            <div className="mb-4 h-6 w-32 animate-pulse rounded-md bg-discogs-border"></div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
