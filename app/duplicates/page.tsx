import AppLayout from '@/components/layout/AppLayout';
import { getCachedCollection, getCollectionDuplicates } from '@/lib/data';
import type { CollectionRelease } from '@/lib/types';
import AlbumListItem from '@/components/AlbumListItem';

export const dynamic = 'force-dynamic';

const getArtistName = (item: CollectionRelease): string => {
  return item.basic_information.artists?.[0]?.name || 'Unknown Artist';
};

export default async function DuplicatesPage() {
  const collection = await getCachedCollection();
  const duplicateGroups = getCollectionDuplicates(collection);

  return (
    <AppLayout activeView="duplicates">
      <div className="p-4 sm:p-6">
        <h1 className="mb-6 text-2xl font-bold text-discogs-text">
          Duplicate Releases in Collection
        </h1>
        {duplicateGroups.length === 0 ? (
          <p className="mt-10 text-center text-discogs-text-secondary">
            No duplicate releases found in your cached collection. Try syncing
            with Discogs.
          </p>
        ) : (
          <div className="space-y-8">
            {duplicateGroups.map((group, index) => {
              const firstItem = group[0].basic_information;
              return (
                <section
                  key={firstItem.master_id}
                  className="animate-slide-up rounded-xl border border-discogs-border bg-discogs-bg-light p-4 shadow-lg transition-shadow duration-300 hover:shadow-glow-blue/20 sm:p-6"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <h2 className="mb-4 truncate text-xl font-semibold text-discogs-blue">
                    <a
                      href={`https://www.discogs.com/master/${firstItem.master_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {getArtistName(group[0])} - {firstItem.title}
                    </a>
                  </h2>
                  <ul className="space-y-3">
                    {group.map((release) => (
                      <AlbumListItem
                        key={release.instance_id}
                        item={release}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
