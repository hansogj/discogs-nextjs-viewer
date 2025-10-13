import AppLayout from '@/components/layout/AppLayout';
import { getCachedCollection, getCollectionDuplicates } from '@/lib/data';
import type { CollectionRelease, BasicInformation } from '@/lib/types';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

const getArtistName = (item: CollectionRelease): string => {
  return item.basic_information.artists?.[0]?.name || 'Unknown Artist';
};

// Helper function to format media descriptions
const formatMedia = (formats: BasicInformation['formats']): string => {
  if (!formats || formats.length === 0) return 'N/A';
  return formats
    .map((f) => {
      let desc = f.name;
      if (f.descriptions && f.descriptions.length > 0) {
        desc += `, ${f.descriptions.join(', ')}`;
      }
      return `${f.qty} x ${desc}`;
    })
    .join('; ');
};

const PLACEHOLDER_IMAGE_URL =
  "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3e%3crect width='100' height='100' fill='%231d1f24'/%3e%3ccircle cx='50' cy='50' r='35' stroke='%232f323a' stroke-width='4'/%3e%3ccircle cx='50' cy='50' r='10' fill='%23101114' stroke='%232f323a' stroke-width='2'/%3e%3cpath d='M45 55 a5,5 0 0,1 10,0 l0,-20 a5,5 0 0,1 5,-5 a5,5 0 0,1 5,5' stroke='%23a0a0a0' stroke-width='3'/%3e%3ccircle cx='47.5' cy='55' r='4' fill='%23a0a0a0'/%3e%3ccircle cx='62.5' cy='40' r='4' fill='%23a0a0a0'/%3e%3c/svg%3e";

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
                  <ul className="space-y-4">
                    {group.map((release) => (
                      <li
                        key={release.instance_id}
                        className="flex flex-col space-y-3 rounded-lg border border-discogs-border/50 bg-discogs-bg p-3 sm:flex-row sm:space-y-0 sm:space-x-4"
                      >
                        <a
                          href={`https://www.discogs.com/release/${release.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block flex-shrink-0"
                        >
                          <Image
                            src={
                              release.basic_information.cover_image ||
                              PLACEHOLDER_IMAGE_URL
                            }
                            alt={`${getArtistName(release)} - ${
                              release.basic_information.title
                            }`}
                            width={100}
                            height={100}
                            className="aspect-square w-full rounded-md object-cover transition-transform duration-300 hover:scale-105 sm:w-24"
                            placeholder="blur"
                            blurDataURL={PLACEHOLDER_IMAGE_URL}
                          />
                        </a>
                        <div className="grid flex-grow grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <DetailItem
                            label="Release ID"
                            value={release.id}
                            isLink
                            href={`https://www.discogs.com/release/${release.id}`}
                          />
                          <DetailItem
                            label="Year"
                            value={release.basic_information.year || 'N/A'}
                          />
                          <DetailItem
                            label="Label"
                            value={`${
                              release.basic_information.labels?.[0]?.name ||
                              'N/A'
                            } (${
                              release.basic_information.labels?.[0]?.catno ||
                              'N/A'
                            })`}
                          />
                          <DetailItem
                            label="Folder ID"
                            value={release.folder_id}
                          />
                          <div className="col-span-2">
                            <DetailItem
                              label="Media"
                              value={formatMedia(
                                release.basic_information.formats,
                              )}
                            />
                          </div>
                        </div>
                      </li>
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

const DetailItem: React.FC<{
  label: string;
  value: string | number;
  isLink?: boolean;
  href?: string;
}> = ({ label, value, isLink, href }) => (
  <div>
    <p className="font-semibold text-discogs-text-secondary">{label}</p>
    {isLink ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="truncate text-discogs-text hover:text-discogs-blue hover:underline"
      >
        {value}
      </a>
    ) : (
      <p className="truncate text-discogs-text">{value}</p>
    )}
  </div>
);