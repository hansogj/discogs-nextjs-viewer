import AppLayout from "@/components/layout/AppLayout";
import { getCollectionWithCache, getCollectionDuplicates } from "@/lib/data";
import Grid from "@/components/Grid";
import type { CollectionRelease } from "@/lib/types";

const getArtistName = (item: CollectionRelease): string => {
    return item.basic_information.artists?.[0]?.name || 'Unknown Artist';
};

export default async function DuplicatesPage() {
    const collection = await getCollectionWithCache();
    const duplicateGroups = getCollectionDuplicates(collection);

    return (
        <AppLayout activeView="duplicates">
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-6 text-discogs-text">Duplicate Releases in Collection</h1>
                {duplicateGroups.length === 0 ? (
                    <p className="text-center text-discogs-text-secondary mt-10">No duplicate releases found.</p>
                ) : (
                    <div className="space-y-8">
                        {duplicateGroups.map((group) => {
                            const firstItem = group[0].basic_information;
                            return (
                                <section key={firstItem.master_id} className="bg-discogs-bg-light/50 p-4 rounded-lg border border-discogs-border">
                                    <h2 className="text-xl font-semibold text-discogs-blue mb-4 truncate">
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
