'use server';
import 'server-only';
import pLimit from 'p-limit';
import type {
  DiscogsUser,
  CollectionResponse,
  WantlistResponse,
  CollectionRelease,
  WantlistRelease,
  MasterRelease,
  ProcessedWantlistItem,
  DiscogsUserProfile,
  FullRelease,
  ReleaseDetails,
  FoldersResponse,
  Folder,
} from './types';

// --- Discogs API Rate Limiter ---
// Discogs allows 60 requests per minute for authenticated users.
// We'll be conservative and limit it to 58 to avoid edge cases.
const RATE_LIMIT_COUNT = 58;
const RATE_LIMIT_PERIOD_MS = 60 * 1000; // 1 minute
const requestTimestamps: number[] = [];

/**
 * Creates a function that executes promises in sequence, not in parallel.
 * This is crucial for atomically updating the rate limiter state.
 */
const createSerializedExecutor = () => {
  let lastPromise: Promise<any> = Promise.resolve();
  return (fn: () => Promise<void>) => {
    // Chain the new function call off the last promise.
    // `lastPromise.then(fn)` ensures `fn` only runs after the previous promise is resolved.
    lastPromise = lastPromise.then(fn, fn); // Also run on rejection to not halt the queue
    return lastPromise;
  };
};

const serializedRateCheck = createSerializedExecutor();

/**
 * Ensures that the application does not exceed the Discogs API rate limit.
 * It uses a serialized promise executor to prevent race conditions when multiple
 * requests are fired concurrently.
 */
function ensureRateLimit() {
  return serializedRateCheck(async () => {
    let now = Date.now();

    // Prune timestamps older than the rate limit period.
    while (
      requestTimestamps.length > 0 &&
      requestTimestamps[0] < now - RATE_LIMIT_PERIOD_MS
    ) {
      requestTimestamps.shift();
    }

    // If we've hit the limit, wait until the oldest request expires.
    if (requestTimestamps.length >= RATE_LIMIT_COUNT) {
      const oldestTimestamp = requestTimestamps[0];
      // Calculate time to wait until the oldest request is out of the window.
      const timeToWait =
        oldestTimestamp + RATE_LIMIT_PERIOD_MS - now + 100; // Increased buffer for safety

      if (timeToWait > 0) {
        console.log(
          `Discogs rate limit reached. Waiting for ${Math.ceil(
            timeToWait / 1000,
          )}s...`,
        );
        await new Promise((r) => setTimeout(r, timeToWait));
      }
    }

    // Record the timestamp for this request *after* any potential waiting.
    requestTimestamps.push(Date.now());
  });
}
// --- End Rate Limiter ---

const API_BASE_URL = 'https://api.discogs.com';

const getAuthHeader = (token: string) => ({
  Authorization: `Discogs token=${token}`,
  'User-Agent': 'DiscogsNextJSViewer/1.0', // Discogs requires a User-Agent
});

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000; // Start with a 2-second delay

async function fetchDiscogsAPI<T>(url: string, token: string): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Wait for rate limiter before each attempt
    await ensureRateLimit();

    try {
      const response = await fetch(url, {
        headers: getAuthHeader(token),
        // Caching is now handled by our file system cache, so don't use Next.js fetch cache here.
        cache: 'no-store',
      });

      if (response.ok) {
        return response.json() as Promise<T>;
      }

      // Retry on 5xx server errors, as they are often transient
      if (response.status >= 500 && response.status < 600) {
        lastError = new Error(
          `Discogs API server error: ${response.status} ${response.statusText} on ${url}`,
        );
        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(
          `[Discogs API] Attempt ${
            attempt + 1
          }/${MAX_RETRIES} failed with server error ${
            response.status
          }. Retrying in ${delay / 1000}s...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue; // Go to next attempt
      }

      // For any other non-ok status (like 4xx), throw immediately, don't retry
      throw new Error(
        `Discogs API error: ${response.status} ${response.statusText} on ${url}`,
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If it's a non-retryable API error thrown from above, re-throw it to exit the loop.
      if (lastError.message.startsWith('Discogs API error:')) {
        throw lastError;
      }

      // For network errors, log and prepare for retry
      const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      console.warn(
        `[Discogs API] Attempt ${
          attempt + 1
        }/${MAX_RETRIES} failed with a network error. Retrying in ${
          delay / 1000
        }s...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // If loop finishes, all retries have failed.
  throw (
    lastError || new Error(`[Discogs API] All attempts to fetch ${url} failed.`)
  );
}

export async function getIdentity(token: string): Promise<DiscogsUser> {
  return fetchDiscogsAPI<DiscogsUser>(`${API_BASE_URL}/oauth/identity`, token);
}

export async function getFolders(
  username: string,
  token: string,
): Promise<Folder[]> {
  const url = `${API_BASE_URL}/users/${username}/collection/folders`;
  const response = await fetchDiscogsAPI<FoldersResponse>(url, token);
  return response.folders;
}

export async function getUserProfile(
  username: string,
  token: string,
): Promise<DiscogsUserProfile> {
  const url = `${API_BASE_URL}/users/${username}`;
  return fetchDiscogsAPI<DiscogsUserProfile>(url, token);
}

async function fetchAllPaginatedData<T, R>(
  initialUrl: string,
  token: string,
  dataKey: keyof R,
  resourceName: string,
  onProgress?: (progress: {
    page: number;
    pages: number;
    resource: string;
  }) => void,
  stopAtDate?: string,
): Promise<{ items: T[]; fullFetch: boolean }> {
  let allData: T[] = [];
  let nextUrl: string | undefined = initialUrl;
  let stoppedEarly = false;

  type PaginatedResponse = R & {
    pagination: { page: number; pages: number; urls: { next?: string } };
  };

  while (nextUrl) {
    const urlWithoutToken = nextUrl.replace(/token=[^&]+/, 'token=REDACTED');
    console.log(`[Discogs API] Fetching page: ${urlWithoutToken}`);
    const response: PaginatedResponse =
      await fetchDiscogsAPI<PaginatedResponse>(nextUrl, token);

    if (onProgress && response.pagination) {
      // Fire-and-forget the progress update
      onProgress({
        page: response.pagination.page,
        pages: response.pagination.pages,
        resource: resourceName,
      });
    }

    const data = response[dataKey] as T[] | undefined;
    if (data && data.length > 0) {
      if (stopAtDate) {
        // This assumes T has date_added. The callers (collection/wantlist) do.
        const itemsWithDate = data as (T & { date_added: string })[];
        const stopIndex = itemsWithDate.findIndex(
          (item) => new Date(item.date_added) <= new Date(stopAtDate),
        );

        if (stopIndex !== -1) {
          const newItems = itemsWithDate.slice(0, stopIndex);
          allData.push(...(newItems as T[]));
          stoppedEarly = true;
          break; // Exit the while loop
        }
      }
      // If no stop date or stop date not found on this page
      allData.push(...data);
    } else {
      break;
    }
    nextUrl = response.pagination?.urls?.next;
  }
  return { items: allData, fullFetch: !stoppedEarly };
}

export async function getFullCollection(
  username: string,
  token: string,
  onProgress?: (progress: any) => void,
  lastSyncDate?: string,
): Promise<{ items: CollectionRelease[]; fullFetch: boolean }> {
  // IMPORTANT: The API needs `sort=added&sort_order=desc` for incremental sync to work
  const url = `${API_BASE_URL}/users/${username}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=100`;
  return fetchAllPaginatedData<CollectionRelease, CollectionResponse>(
    url,
    token,
    'releases',
    'collection',
    onProgress,
    lastSyncDate,
  );
}

export async function getFullWantlist(
  username: string,
  token: string,
  onProgress?: (progress: any) => void,
  lastSyncDate?: string,
): Promise<{ items: WantlistRelease[]; fullFetch: boolean }> {
  // IMPORTANT: The API needs `sort=added&sort_order=desc` for incremental sync to work
  const url = `${API_BASE_URL}/users/${username}/wants?sort=added&sort_order=desc&per_page=100`;
  return fetchAllPaginatedData<WantlistRelease, WantlistResponse>(
    url,
    token,
    'wants',
    'wantlist',
    onProgress,
    lastSyncDate,
  );
}

export async function getMasterRelease(
  masterId: number,
  token: string,
): Promise<MasterRelease> {
  const url = `${API_BASE_URL}/masters/${masterId}`;
  return fetchDiscogsAPI<MasterRelease>(url, token);
}

export async function getRelease(
  releaseId: number,
  token: string,
): Promise<FullRelease> {
  const url = `${API_BASE_URL}/releases/${releaseId}`;
  return fetchDiscogsAPI<FullRelease>(url, token);
}

export async function fetchAndAddDetailsToReleases<
  T extends { id: number; basic_information: { id: number } },
>(
  items: T[],
  token: string,
  resourceName: 'collection_details' | 'wantlist_details',
  onProgress: (progress: {
    processed: number;
    total: number;
    resource: string;
  }) => void,
): Promise<(T & { details?: ReleaseDetails })[]> {
  if (items.length === 0) return [];
  const limit = pLimit(10);
  let processedCount = 0;
  const total = items.length;

  const itemsWithDetailsPromises = items.map((item) =>
    limit(async () => {
      try {
        // Use basic_information.id, which is the release ID. The top-level `id` for wantlist is the want ID.
        const details: FullRelease = await getRelease(
          item.basic_information.id,
          token,
        );
        processedCount++;
        onProgress({
          processed: processedCount,
          total,
          resource: resourceName,
        });
        return {
          ...item,
          details: {
            extraartists: details.extraartists,
            notes: details.notes,
            styles: details.styles,
            genres: details.genres,
          },
        };
      } catch (error) {
        console.error(
          `Failed to fetch details for release ${item.basic_information.id}`,
          error,
        );
        processedCount++;
        onProgress({
          processed: processedCount,
          total,
          resource: resourceName,
        });
        return item; // return original on error
      }
    }),
  );
  return Promise.all(itemsWithDetailsPromises);
}

export async function processWantlist(
  wantlist: WantlistRelease[],
  token: string,
): Promise<ProcessedWantlistItem[]> {
  if (wantlist.length === 0) return [];
  // Set a concurrency limit to avoid overwhelming the Discogs API,
  // even with the rate limiter in place. This provides a more robust
  // way to handle the burst of requests from processing the wantlist.
  const limit = pLimit(10);

  const processedItemsPromises = wantlist.map((want) =>
    limit(async () => {
      // Only fetch master if there's a master ID
      if (want.basic_information.master_id > 0) {
        try {
          const master = await getMasterRelease(
            want.basic_information.master_id,
            token,
          );
          const masterImage =
            master.images?.find((img) => img.type === 'primary')?.uri ||
            want.basic_information.cover_image;
          return {
            ...want,
            master_cover_image: masterImage,
            master_year: master.year,
          };
        } catch (error) {
          console.error(
            `Failed to fetch master for ${want.basic_information.title}`,
            error,
          );
        }
      }
      // Fallback for items with no master or if fetch fails
      return {
        ...want,
        master_cover_image: want.basic_information.cover_image,
      };
    }),
  );

  return Promise.all(processedItemsPromises);
}
