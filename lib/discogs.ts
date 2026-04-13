import crypto from 'crypto';
import OAuth from 'oauth-1.0a';
import pLimit from 'p-limit';
import type { 
  DiscogsUser, 
  DiscogsUserProfile, 
  Folder, 
  CustomFieldsResponse, 
  CollectionRelease, 
  WantlistRelease, 
  MasterRelease, 
  ProcessedWantlistItem, 
  Pagination, 
  CollectionResponse, 
  WantlistResponse, 
  FoldersResponse, 
  SyncInfo, 
  CustomField, 
  SyncProgress, 
  ReleaseDetails, 
  BasicInformation,
  FullRelease,
} from './types';


const API_BASE_URL = 'https://api.discogs.com';
const DISCOGS_REQUEST_TOKEN_URL = 'https://api.discogs.com/oauth/request_token';
const DISCOGS_ACCESS_TOKEN_URL = 'https://api.discogs.com/oauth/access_token';
const DISCOGS_AUTHORIZE_URL = 'https://www.discogs.com/oauth/authorize';

if (!process.env.DISCOGS_CONSUMER_KEY || !process.env.DISCOGS_CONSUMER_SECRET) {
  throw new Error('Missing DISCOGS_CONSUMER_KEY or DISCOGS_CONSUMER_SECRET environment variables.');
}

const oauth = new OAuth({
  consumer: {
    key: process.env.DISCOGS_CONSUMER_KEY,
    secret: process.env.DISCOGS_CONSUMER_SECRET,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

export type OAuthTokens = {
  oauth_token: string;
  oauth_token_secret: string;
};

export type DiscogsAuth = string | OAuthTokens;

// Simple rate limiter implementation
let lastRequestTime = 0;
async function ensureRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  // Discogs limit is 60/min, so roughly 1s per request.
  // We use 1.1s to be safe.
  if (timeSinceLastRequest < 1100) {
    const waitTime = 1100 - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
}

// Original getAuthHeader, now only for plain tokens.
const getAuthHeaderPlainToken = (token: string) => ({
  Authorization: `Discogs token=${token}`,
  'User-Agent': 'DiscogsNextJSViewer/1.0', // Discogs requires a User-Agent
});

// New getAuthHeader for OAuth.
const getAuthHeaderOAuth = (
  url: string,
  method: string,
  oauthToken?: OAuthTokens,
) => {
  const token = oauthToken
    ? {
        key: oauthToken.oauth_token,
        secret: oauthToken.oauth_token_secret,
      }
    : undefined;
  const authorization = oauth.toHeader(
    oauth.authorize({ url, method }, token),
  );
  return {
    ...authorization,
    'User-Agent': 'DiscogsNextJSViewer/1.0',
  };
};

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000; // Start with a 2-second delay

type FetchDiscogsAPIParams = {
  url: string;
  method?: string;
  auth?: DiscogsAuth;
};

async function fetchDiscogsAPI<T>(params: FetchDiscogsAPIParams): Promise<T> {
  const { url, method = 'GET', auth } = params;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    await ensureRateLimit();

    try {
      let headers: HeadersInit;
      if (typeof auth === 'object' && auth !== null && 'oauth_token' in auth) {
        headers = getAuthHeaderOAuth(url, method, auth);
      } else if (typeof auth === 'string') {
        headers = getAuthHeaderPlainToken(auth);
      } else {
        throw new Error('No authentication token provided for Discogs API call.');
      }

      const response = await fetch(url, {
        headers,
        method,
        cache: 'no-store',
      });

      if (response.ok) {
        return response.json() as Promise<T>;
      }

      // Retry on 5xx server errors, 429 (Rate Limit), or a 401 (sometimes transient auth issues)
      if (
        (response.status >= 500 && response.status < 600) ||
        response.status === 429 ||
        response.status === 401
      ) {
        const isRateLimit = response.status === 429;
        lastError = new Error(
          `Discogs API ${
            isRateLimit ? 'rate limit' : 'server'
          } error: ${response.status} ${response.statusText} on ${url}`,
        );

        let delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);

        if (isRateLimit) {
          const retryAfter = response.headers.get('Retry-After');
          if (retryAfter) {
            const seconds = parseInt(retryAfter, 10);
            if (!isNaN(seconds)) {
              delay = seconds * 1000;
            }
          }
        }

        console.warn(
          `[Discogs API] Attempt ${
            attempt + 1
          }/${MAX_RETRIES} failed with ${
            isRateLimit ? 'rate limit' : `error ${response.status}`
          }. Retrying in ${delay / 1000}s...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue; // Go to next attempt
      }

      throw new Error(
        `Discogs API error: ${response.status} ${response.statusText} on ${url}`,
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError.message.startsWith('Discogs API error:')) {
        throw lastError;
      }

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

  throw (
    lastError || new Error(`[Discogs API] All attempts to fetch ${url} failed.`)
  );
}

// OAuth-specific functions
export async function getDiscogsRequestToken(callbackUrl: string) {
  const request_data = {
    url: DISCOGS_REQUEST_TOKEN_URL,
    method: 'GET',
    data: { oauth_callback: callbackUrl },
  };
  const fetchResult = await fetch(request_data.url, {
    method: request_data.method,
    headers: oauth.toHeader(oauth.authorize(request_data)) as unknown as Record<string, string>,
  });
  if (!fetchResult.ok) {
    const errorText = await fetchResult.text();
    throw new Error(`Failed to fetch request token: ${fetchResult.status} ${fetchResult.statusText}. Body: ${errorText}`);
  }
  const text = await fetchResult.text();
  const params = new URLSearchParams(text);
  const token = params.get('oauth_token') || '';
  const tokenSecret = params.get('oauth_token_secret') || '';
  if (!token || !tokenSecret) {
    throw new Error('Failed to parse oauth_token or oauth_token_secret from response.');
  }
  return {
    oauth_token: token,
    oauth_token_secret: tokenSecret,
  };
}

export async function getDiscogsAuthorizeUrl(oauth_token: string) {
  return `${DISCOGS_AUTHORIZE_URL}?oauth_token=${oauth_token}`;
}

export async function getDiscogsAccessToken(
  requestToken: string,
  requestTokenSecret: string,
  oauthVerifier: string,
): Promise<OAuthTokens> {
  const request_data = {
    url: DISCOGS_ACCESS_TOKEN_URL,
    method: 'POST',
    data: { oauth_verifier: oauthVerifier },
  };
  const token = {
    key: requestToken,
    secret: requestTokenSecret,
  };
  const fetchResult = await fetch(request_data.url, {
    method: request_data.method,
    headers: oauth.toHeader(oauth.authorize(request_data, token)) as unknown as Record<string, string>,
  });
  if (!fetchResult.ok) {
      const errorText = await fetchResult.text();
      throw new Error(`Failed to fetch access token: ${fetchResult.status} ${fetchResult.statusText}. Body: ${errorText}`);
  }
  const text = await fetchResult.text();
  const params = new URLSearchParams(text);
  const accessToken = params.get('oauth_token') || '';
  const accessTokenSecret = params.get('oauth_token_secret') || '';

  if (!accessToken || !accessTokenSecret) {
      throw new Error('Failed to parse oauth_token or oauth_token_secret from access token response.');
  }

  return {
    oauth_token: accessToken,
    oauth_token_secret: accessTokenSecret,
  };
}

// All existing API calls need to be updated to use the new fetchDiscogsAPI signature
// For now, I'll keep the `token` parameter for existing functions as `plainToken` for compatibility,
// but they should eventually be updated to accept an `OAuthTokens` object.

export async function getIdentity(auth: DiscogsAuth): Promise<DiscogsUser> {
  return fetchDiscogsAPI<DiscogsUser>({ url: `${API_BASE_URL}/oauth/identity`, auth });
}

export async function getFolders(
  username: string,
  auth: DiscogsAuth,
): Promise<Folder[]> {
  const url = `${API_BASE_URL}/users/${username}/collection/folders`;
  const response = await fetchDiscogsAPI<FoldersResponse>({ url, auth });
  return response.folders;
}

export async function getCustomFields(
  username: string,
  auth: DiscogsAuth,
): Promise<CustomFieldsResponse> {
  const url = `${API_BASE_URL}/users/${username}/collection/fields`;
  return fetchDiscogsAPI<CustomFieldsResponse>({ url, auth });
}

export async function getUserProfile(
  username: string,
  auth: DiscogsAuth,
): Promise<DiscogsUserProfile> {
  const url = `${API_BASE_URL}/users/${username}`;
  return fetchDiscogsAPI<DiscogsUserProfile>({ url, auth });
}

async function fetchAllPaginatedData<T, R>(
  initialUrl: string,
  auth: DiscogsAuth,
  dataKey: keyof R,
  resourceName: string,
  onProgress?: (progress: {
    page: number;
    pages: number;
    resource: string;
  }) => void,
  stopAtDate?: string,
  limit?: number,
): Promise<{ items: T[]; fullFetch: boolean }> {
  let allData: T[] = [];
  let nextUrl: string | undefined = initialUrl;
  let stoppedEarly = false;

  type PaginatedResponse = R & {
    pagination: { page: number; pages: number; urls: { next?: string } };
  };

  while (nextUrl && (!limit || allData.length < limit)) {
    const urlWithoutToken = nextUrl.replace(/token=[^&]+/, 'token=REDACTED');
    console.log(`[Discogs API] Fetching page: ${urlWithoutToken}`);
    const response: PaginatedResponse =
      await fetchDiscogsAPI<PaginatedResponse>({ url: nextUrl, auth });

    if (onProgress && response.pagination) {
      onProgress({
        page: response.pagination.page,
        pages: response.pagination.pages,
        resource: resourceName,
      });
    }

    const data = response[dataKey] as T[] | undefined;
    if (data && data.length > 0) {
      const itemsToAdd = limit ? data.slice(0, limit - allData.length) : data;
      if (stopAtDate) {
        const itemsWithDate = itemsToAdd as (T & { date_added: string })[];
        const stopIndex = itemsWithDate.findIndex(
          (item) => new Date(item.date_added) <= new Date(stopAtDate),
        );

        if (stopIndex !== -1) {
          const newItems = itemsWithDate.slice(0, stopIndex);
          allData.push(...(newItems as T[]));
          stoppedEarly = true;
          break;
        }
      }
      allData.push(...itemsToAdd);
    } else {
      break;
    }
    nextUrl = response.pagination?.urls?.next;
  }
  return { items: allData, fullFetch: !stoppedEarly };
}

export async function getFullCollection(
  username: string,
  auth: DiscogsAuth,
  onProgress?: (progress: any) => void,
  lastSyncDate?: string,
  limit?: number,
): Promise<{ items: CollectionRelease[]; fullFetch: boolean }> {
  const url = `${API_BASE_URL}/users/${username}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=100`;
  return fetchAllPaginatedData<CollectionRelease, CollectionResponse>(
    url,
    auth,
    'releases',
    'collection',
    onProgress,
    lastSyncDate,
    limit,
  );
}

export async function getFullWantlist(
  username: string,
  auth: DiscogsAuth,
  onProgress?: (progress: any) => void,
  lastSyncDate?: string,
  limit?: number,
): Promise<{ items: WantlistRelease[]; fullFetch: boolean }> {
  const url = `${API_BASE_URL}/users/${username}/wants?sort=added&sort_order=desc&per_page=100`;
  return fetchAllPaginatedData<WantlistRelease, WantlistResponse>(
    url,
    auth,
    'wants',
    'wantlist',
    onProgress,
    lastSyncDate,
    limit,
  );
}

export async function getMasterRelease(
  masterId: number,
  auth: DiscogsAuth,
): Promise<MasterRelease> {
  const url = `${API_BASE_URL}/masters/${masterId}`;
  return fetchDiscogsAPI<MasterRelease>({ url, auth });
}

export async function getRelease(
  releaseId: number,
  auth: DiscogsAuth,
): Promise<FullRelease> {
  const url = `${API_BASE_URL}/releases/${releaseId}`;
  return fetchDiscogsAPI<FullRelease>({ url, auth });
}

export async function fetchAndAddDetailsToReleases<
  T extends { id: number; basic_information: { id: number } },
>(
  items: T[],
  auth: DiscogsAuth,
  resourceName: 'collection_details' | 'wantlist_details',
  onProgress: (progress: {
    processed: number;
    total: number;
    resource: string;
  }) => void,
): Promise<(T & { details?: ReleaseDetails })[]> {
  const limit = pLimit(1);
  let processedCount = 0;
  const total = items.length;

  const itemsWithDetailsPromises = items.map((item) =>
    limit(async () => {
      try {
        const details: FullRelease = await getRelease(
          item.basic_information.id,
          auth,
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
        return item;
      }
    }),
  );
  return Promise.all(itemsWithDetailsPromises);
}

export async function processWantlist(
  wantlist: WantlistRelease[],
  auth: DiscogsAuth,
): Promise<ProcessedWantlistItem[]> {
  if (wantlist.length === 0) return [];
  const limit = pLimit(2);

  const processedItemsPromises = wantlist.map((want) =>
    limit(async () => {
      if (want.basic_information.master_id > 0) {
        try {
          const master = await getMasterRelease(
            want.basic_information.master_id,
            auth,
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
      return {
        ...want,
        master_cover_image: want.basic_information.cover_image,
      };
    }),
  );

  return Promise.all(processedItemsPromises);
}

export async function addMasterInfoToCollection(
  collection: CollectionRelease[],
  auth: DiscogsAuth,
  onProgress: (progress: {
    processed: number;
    total: number;
    resource: string;
  }) => void,
): Promise<CollectionRelease[]> {
  if (collection.length === 0) return [];
  const limit = pLimit(2);
  let processedCount = 0;
  const total = collection.length;

  const reportProgress = () => {
    processedCount++;
    onProgress({
      processed: processedCount,
      total,
      resource: 'collection_masters',
    });
  };

  const itemsWithMasterInfoPromises = collection.map((item) =>
    limit(async () => {
      if (item.basic_information.master_id > 0) {
        try {
          const master = await getMasterRelease(
            item.basic_information.master_id,
            auth,
          );
          reportProgress();
          return {
            ...item,
            master_year: master.year,
          };
        } catch (error) {
          console.error(
            `Failed to fetch master for release ${item.basic_information.id}`,
            error,
          );
          reportProgress(); // report progress even on failure
          return item;
        }
      } else {
        reportProgress();
        return item; // return original if no master_id
      }
    }),
  );
  return Promise.all(itemsWithMasterInfoPromises);
}
