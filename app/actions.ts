// app/actions.ts
'use server';

import { getSession } from "@/lib/session";
import { getCollectionPage as getCollectionPageFromApi, getWantlistPage as getWantlistPageFromApi, processWantlist } from "@/lib/discogs";
import type { SortKey, SortOrder } from "@/components/SortControls";

const ITEMS_PER_PAGE = 48;

// Maps our internal sort keys to the keys the Discogs API expects.
const sortKeyMap: Record<SortKey, string> = {
    'date_added': 'added',
    'year': 'year',
    'title': 'title',
    'artist': 'artist'
};

export async function fetchCollectionPage(page: number, sortKey: SortKey, sortOrder: SortOrder) {
    const session = await getSession();
    if (!session.isLoggedIn || !session.user || !session.token) {
        throw new Error('Not authenticated');
    }

    return getCollectionPageFromApi(
        session.user.username,
        session.token,
        page,
        ITEMS_PER_PAGE,
        sortKeyMap[sortKey],
        sortOrder
    );
}

export async function fetchWantlistPage(page: number, sortKey: SortKey, sortOrder: SortOrder) {
     const session = await getSession();
    if (!session.isLoggedIn || !session.user || !session.token) {
        throw new Error('Not authenticated');
    }

    const { data: rawWants, pagination } = await getWantlistPageFromApi(
        session.user.username,
        session.token,
        page,
        ITEMS_PER_PAGE,
        sortKeyMap[sortKey],
        sortOrder
    );

    // After fetching a page of the wantlist, we still need to process it
    // to get master release images.
    const processedWants = await processWantlist(rawWants, session.token);

    return { data: processedWants, pagination };
}