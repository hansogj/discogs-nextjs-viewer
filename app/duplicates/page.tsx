import AppLayout from '@/components/layout/AppLayout';
import { getHeaderData, getCollectionDuplicates } from '@/lib/data';
import Grid from '@/components/Grid';
import type { CollectionRelease } from '@/lib/types';

const getArtistName = (item: CollectionRelease): string => {
  return item.basic_information.artists?.[0]?.name || 'Unknown Artist';
};

export default async function DuplicatesPage() {
  // We need the full collection to find duplicates
  const { fullCollectionForDuplicates } = await getHeaderData();
  const duplicateGroups = getCollectionDuplicates(fullCollectionForDuplicates);

  return (
    <AppLayout activeView="duplicates">
      <div className="p-4 sm:p-6">
        <h1 className="mb-6 text-2xl font-bold text-discogs-text">
          Duplicate Releases in Collection
        </h1>
        {duplicateGroups.length === 0 ? (
          <p className="mt-10 text-center text-discogs-text-secondary">
            No duplicate releases found.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            {duplicateGroups.map((group, index) => {
              const firstItem = group[0].basic_information;
              return (
                <section
                  key={firstItem.master_id}
                  className="animate-slide-up flex flex-col rounded-xl border border-discogs-border bg-discogs-bg-light p-4 shadow-lg transition-shadow duration-300 hover:shadow-glow-blue/20"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <h2 className="mb-2 truncate text-xl font-semibold text-discogs-blue">
                    <a
                      href={`https://www.discogs.com/master/${firstItem.master_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {getArtistName(group[0])} - {firstItem.title}
                    </a>
                  </h2>
                  <div className="flex-grow">
                    <Grid
                      items={group}
                      gridClassNames="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2"
                    />
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
