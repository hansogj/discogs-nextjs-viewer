import type { DiscogsUser, CollectionResponse, WantlistResponse, CollectionRelease, WantlistRelease, MasterRelease, ProcessedWantlistItem } from './types';

// --- Discogs API Rate Limiter ---
// Discogs allows 60 requests per minute for authenticated users.
// We'll be conservative and limit it to 58 to avoid edge cases.
const RATE_LIMIT_COUNT = 58;
const RATE_LIMIT_PERIOD_MS = 60 * 1000; // 1 minute
const requestTimestamps: number[] = [];

/**
 * Ensures that the application does not exceed the Discogs API rate limit.
 * It checks recent request timestamps and waits if the limit has been reached.
 */
async function ensureRateLimit() {
    // This loop ensures that after waiting, we re-check the condition
    // before proceeding.
    while (true) {
        const now = Date.now();

        // Remove timestamps that are older than the rate limit period.
        while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_PERIOD_MS) {
            requestTimestamps.shift();
        }

        if (requestTimestamps.length < RATE_LIMIT_COUNT) {
            // We are under the limit, we can break the loop and proceed.
            break;
        }

        // If we've reached this point, the limit has been hit.
        // We need to wait until the oldest request is outside the 60-second window.
        const oldestTimestamp = requestTimestamps[0];
        const timeSinceOldestRequest = now - oldestTimestamp;
        const waitTime = RATE_LIMIT_PERIOD_MS - timeSinceOldestRequest;

        if (waitTime > 0) {
            console.log(`Discogs rate limit reached. Waiting for ${Math.ceil(waitTime / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    // Add a timestamp for the new request we are about to make.
    requestTimestamps.push(Date.now());
}
// --- End Rate Limiter ---


const API_BASE_URL = 'https://api.discogs.com';

const getAuthHeader = (token: string) => ({
    'Authorization': `Discogs token=${token}`,
    'User-Agent': 'DiscogsNextJSViewer/1.0', // Discogs requires a User-Agent
});

async function fetchDiscogsAPI<T,>(url: string, token: string): Promise<T> {
    await ensureRateLimit(); // Enforce rate limiting before every API call.

    // FIX: Cast options to 'any' to allow Next.js specific fetch properties.
    const response = await fetch(url, { 
        headers: getAuthHeader(token),
        next: { revalidate: 3600 } // Revalidate cache every hour
    } as any);
    if (!response.ok) {
        throw new Error(`Discogs API error: ${response.status} ${response.statusText} on ${url}`);
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

    while (nextUrl) {
        const response = await fetchDiscogsAPI<R & { pagination: { urls: { next?: string } } }>(nextUrl, token);
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
                master_cover_image: want.basic_information.cover_image
            };
        }
    });

    return Promise.all(processedItemsPromises);
}