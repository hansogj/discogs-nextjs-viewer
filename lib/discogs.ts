import type {
  DiscogsUser,
  CollectionResponse,
  WantlistResponse,
  CollectionRelease,
  WantlistRelease,
  MasterRelease,
  ProcessedWantlistItem,
} from './types';

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
        oldestTimestamp + RATE_LIMIT_PERIOD_MS - now + 20; // +20ms buffer for safety

      if (timeToWait > 0) {
        console.log(
          `Discogs rate limit reached. Waiting for ${Math.ceil(
            timeToWait / 1000,
          )}s...`,
        );
        await new Promise((r) => setTimeout(r, timeToWait));
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

async function fetchAllPaginatedData<T, R>(
  initialUrl: string,
  token: string,
  dataKey: keyof R,
): Promise<T[]> {
  let allData: T[] = [];
  let nextUrl: string | undefined = initialUrl;

  type PaginatedResponse = R & { pagination: { urls: { next?: string } } };

  while (nextUrl) {
    const urlWithoutToken = nextUrl.replace(/token=[^&]+/, 'token=REDACTED');
    console.log(`[Discogs API] Fetching page: ${urlWithoutToken}`);
    const response: PaginatedResponse =
      await fetchDiscogsAPI<PaginatedResponse>(nextUrl, token);
    const data = response[dataKey] as T[] | undefined;
    if (data) {
      allData = [...allData, ...data];
    }
    nextUrl = response.pagination?.urls?.next;
  }
  return allData;
}

export async function getFullCollection(
  username: string,
  token: string,
): Promise<CollectionRelease[]> {
  const url = `${API_BASE_URL}/users/${username}/collection/folders/0/releases?per_page=100`;
  return fetchAllPaginatedData<CollectionRelease, CollectionResponse>(
    url,
    token,
    'releases',
  );
}

export async function getFullWantlist(
  username: string,
  token: string,
): Promise<WantlistRelease[]> {
  const url = `${API_BASE_URL}/users/${username}/wants?per_page=100`;
  return fetchAllPaginatedData<WantlistRelease, WantlistResponse>(
    url,
    token,
    'wants',
  );
}

export async function getMasterRelease(
  masterId: number,
  token: string,
): Promise<MasterRelease> {
  const url = `${API_BASE_URL}/masters/${masterId}`;
  return fetchDiscogsAPI<MasterRelease>(url, token);
}

export async function processWantlist(
  wantlist: WantlistRelease[],
  token: string,
): Promise<ProcessedWantlistItem[]> {
  const processedItemsPromises = wantlist.map(async (want) => {
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
  });

  return Promise.all(processedItemsPromises);
}
