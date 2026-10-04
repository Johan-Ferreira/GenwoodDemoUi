/**
 * Data-service client (read-only).
 *
 * Every call goes to the app's own same-origin proxy path (API_BASE_URL,
 * `/curve-data` by default), which next.config.ts rewrites to the real service.
 * The service is read-only, so this client only issues GET requests and offers
 * no write helpers.
 *
 * Failures reject with a ServiceError `{ status, description, retryable, kind }`
 * (see service-error.ts); 401/403 are classed as not-authorised.
 *
 * JSON reads use `get`. Binary/text downloads (xlsx, CSV) use `downloadFile`
 * in download.ts, which shares `requestFromService` below.
 */

import { API_BASE_URL } from '@/lib/utils/constants';
import {
  serviceErrorFromResponse,
  unreachableServiceError,
} from '@/lib/api/service-error';
import type { QueryParams } from '@/types/api';

/**
 * Builds the full proxy URL with query parameters.
 *
 * Array values serialize as repeated params (`['a','b']` → `?k=a&k=b`). Empty
 * arrays and `undefined` values drop the key entirely (the "clear all filters"
 * path). An explicit empty string IS sent for scalars (`?k=`). Array items that
 * are empty strings are dropped.
 */
function buildUrl(endpoint: string, params?: QueryParams): string {
  const baseUrl = `${API_BASE_URL}${endpoint}`;

  if (!params) {
    return baseUrl;
  }

  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== '') {
          queryParams.append(key, String(item));
        }
      });
      return;
    }
    queryParams.append(key, String(value));
  });

  const queryString = queryParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

function logRequest(url: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`API Request: GET ${url}`);
  }
}

function logResponse(url: string, response: Response): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `API Response: ${response.status} ${response.statusText} (${url})`,
    );
  }
}

/**
 * Issues a GET to the data service through the proxy and returns the raw
 * successful Response. Rejects with a ServiceError on any failure.
 */
export async function requestFromService(
  endpoint: string,
  params?: QueryParams,
  accept?: string,
): Promise<Response> {
  const url = buildUrl(endpoint, params);
  logRequest(url);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: accept ? { Accept: accept } : undefined,
    });
  } catch (error) {
    throw unreachableServiceError(error);
  }

  logResponse(url, response);

  if (!response.ok) {
    throw await serviceErrorFromResponse(response);
  }

  return response;
}

/**
 * Reads a JSON resource from the data service.
 *
 * @param endpoint - path under the service, e.g. `/v1/overview`
 * @param params - optional query parameters
 */
export async function get<T>(
  endpoint: string,
  params?: QueryParams,
): Promise<T> {
  const response = await requestFromService(
    endpoint,
    params,
    'application/json',
  );

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
