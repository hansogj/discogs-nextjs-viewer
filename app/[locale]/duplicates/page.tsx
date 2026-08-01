import AppLayout from "@/components/layout/AppLayout";
import {
  getCachedCollection,
  getCollectionDuplicates,
  getCachedFolders,
} from "@/lib/data";
import type { CollectionRelease } from "@/lib/types";
import AlbumListItem from "@/components/AlbumListItem";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

const getArtistName = (item: CollectionRelease, unknown: string): string => {
  return item.basic_information.artists?.[0]?.name || unknown;
};

export default async function DuplicatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("duplicates");
  const tCommon = await getTranslations("common");
  const [collection, folders] = await Promise.all([
    getCachedCollection(),
    getCachedFolders(),
  ]);
  const duplicateGroups = getCollectionDuplicates(collection);
  const unknownArtist = tCommon("unknownArtist");

  return (
    <AppLayout activeView="duplicates">
      <div className="p-4 sm:p-6">
        <h1 className="mb-6 text-2xl font-bold text-discogs-text">
          {t("pageTitle")}
        </h1>
        {duplicateGroups.length === 0 ? (
          <p className="mt-10 text-center text-discogs-text-secondary">
            {t("empty")}
          </p>
        ) : (
          <div className="space-y-8">
            {duplicateGroups.map((group, index) => {
              const firstItem = group[0].basic_information;
              const groupKey =
                firstItem.master_id > 0
                  ? `m-${firstItem.master_id}`
                  : `r-${firstItem.id}`;
              return (
                <section
                  key={groupKey}
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
                      {getArtistName(group[0], unknownArtist)} -{" "}
                      {firstItem.title}
                    </a>
                  </h2>
                  <ul className="space-y-3">
                    {group.map((release) => (
                      <AlbumListItem
                        key={release.instance_id}
                        item={release}
                        folders={folders}
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
