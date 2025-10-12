import type { DiscogsUser, CollectionResponse, WantlistResponse, CollectionRelease, WantlistRelease, MasterRelease, ProcessedWantlistItem } from '../types';

const API_BASE_URL = 'https://api.discogs.com';

const getAuthHeader = (token: string) => ({
    'Authorization': `Discogs token=${token}`,
});

async function fetchDiscogsAPI<T,>(url: string, token: string): Promise<T> {
    const response = await fetch(url, { headers: getAuthHeader(token) });
    if (!response.ok) {
        throw new Error(`Discogs API error: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
}

export async function getIdentity(token: string): Promise<DiscogsUser> {
    return fetchDiscogsAPI<DiscogsUser>(`${API_BASE_URL}/oauth/identity`, token);
}

async function fetchAllPaginatedData<T, R>(
    initialUrl: string, 
    token: string, 
    dataKey: keyof R
): Promise<T[]> {
    let allData: T[] = [];
    let nextUrl: string | undefined = initialUrl;

    type PaginatedResponse = R & { pagination: { urls: { next?: string } } };

    while (nextUrl) {
        const response: PaginatedResponse = await fetchDiscogsAPI<PaginatedResponse>(nextUrl, token);
        const data = response[dataKey] as T[] | undefined;
        if (data) {
            allData = [...allData, ...data];
        }
        nextUrl = response.pagination?.urls?.next;
    }
    return allData;
}

export async function getCollection(username: string, token: string): Promise<CollectionRelease[]> {
    const url = `${API_BASE_URL}/users/${username}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=100`;
    return fetchAllPaginatedData<CollectionRelease, CollectionResponse>(url, token, 'releases');
}

export async function getWantlist(username: string, token: string): Promise<WantlistRelease[]> {
    const url = `${API_BASE_URL}/users/${username}/wants?sort=added&sort_order=desc&per_page=100`;
    return fetchAllPaginatedData<WantlistRelease, WantlistResponse>(url, token, 'wants');
}

export async function getMasterRelease(masterId: number, token: string): Promise<MasterRelease> {
    const url = `${API_BASE_URL}/masters/${masterId}`;
    return fetchDiscogsAPI<MasterRelease>(url, token);
}

export async function processWantlist(wantlist: WantlistRelease[], token: string): Promise<ProcessedWantlistItem[]> {
    const uniqueWants = new Map<number, WantlistRelease>();
    for (const want of wantlist) {
        if (want.basic_information.master_id && !uniqueWants.has(want.basic_information.master_id)) {
            uniqueWants.set(want.basic_information.master_id, want);
        }
    }

    const processedItemsPromises = Array.from(uniqueWants.values()).map(async (want) => {
        try {
            const master = await getMasterRelease(want.basic_information.master_id, token);
            const masterImage = master.images?.find(img => img.type === 'primary')?.uri || want.basic_information.cover_image;
            return {
                ...want,
                master_cover_image: masterImage
            };
        } catch (error) {
            console.error(`Failed to fetch master for ${want.basic_information.title}`, error);
            return {
                ...want,
                master_cover_image: want.basic_information.cover_image // Fallback to release image
            };
        }
    });

    return Promise.all(processedItemsPromises);
}