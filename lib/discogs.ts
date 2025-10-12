import type { DiscogsUser, CollectionResponse, WantlistResponse, CollectionRelease, WantlistRelease, MasterRelease, ProcessedWantlistItem } from './types';

// --- Discogs API Rate Limiter ---
// Discogs allows 60 requests per minute for authenticated users.
// We'll be conservative and limit it to 58 to avoid edge cases.
const RATE_LIMIT_COUNT = 58;
const RATE_LIMIT_PERIOD_MS = 60 * 1000; // 1 minute
const requestTimestamps: number[] = [];

// A promise chain to serialize access to the rate limiter logic, preventing race conditions.
let rateLimiterPromise = Promise.resolve();

/**
 * Ensures that the application does not exceed the Discogs API rate limit.
 * It serializes all requests through a promise chain to prevent race conditions
 * when called concurrently (e.g., from Promise.all).
 */
async function ensureRateLimit() {
    // Capture the current promise in the chain.
    const previous = rateLimiterPromise;
    
    // Create the next link in the chain, which will execute AFTER the previous one.
    const next = previous.then(async () => {
        // CRITICAL SECTION: Only one of these .then() callbacks
        // will execute at a time.
        let now = Date.now();

        // Prune timestamps older than the rate limit period.
        while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_PERIOD_MS) {
            requestTimestamps.shift();
        }

        // If we've hit the limit, wait until the oldest request expires.
        if (requestTimestamps.length >= RATE_LIMIT_COUNT) {
            const oldestTimestamp = requestTimestamps[0];
            // Calculate time to wait until the oldest request is out of the window.
            const timeToWait = (oldestTimestamp + RATE_LIMIT_PERIOD_MS) - now + 20; // +20ms buffer for safety

            if (timeToWait > 0) {
                console.log(`Discogs rate limit reached. Waiting for ${Math.ceil(timeToWait / 1000)}s...`);
                await new Promise(r => setTimeout(r, timeToWait));
            }
        }
        
        // Record the timestamp for this request.
        requestTimestamps.push(Date.now());
    });

    // Update the master promise to point to the new end of the chain.
    rateLimiterPromise = next;
    
    // The caller awaits its link in the chain.
    return next;
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
                master_cover_image: want.basic_information.cover_image
            };
        }
    });

    return Promise.all(processedItemsPromises);
}