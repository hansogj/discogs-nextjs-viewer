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
      <div className="p-4">
        <h1 className="mb-6 text-2xl font-bold text-discogs-text">
          Duplicate Releases in Collection
        </h1>
        {duplicateGroups.length === 0 ? (
          <p className="mt-10 text-center text-discogs-text-secondary">
            No duplicate releases found.
          </p>
        ) : (
          <div className="space-y-8">
            {duplicateGroups.map((group) => {
              const firstItem = group[0].basic_information;
              return (
                <section
                  key={firstItem.master_id}
                  className="rounded-lg border border-discogs-border bg-discogs-bg-light/50 p-4"
                >
                  <h2 className="mb-4 truncate text-xl font-semibold text-discogs-blue">
                    {getArtistName(group[0])} - {firstItem.title}
                  </h2>
                  <Grid items={group} />
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
