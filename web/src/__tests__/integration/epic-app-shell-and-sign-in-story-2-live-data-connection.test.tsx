/**
 * Story Metadata:
 * - Route: null (infrastructure only)
 * - Target File: web/src/lib/api/client.ts
 * - Page Action: modify_existing
 *
 * Epic app-shell-and-sign-in, Story 2: Live data connection and file downloads.
 *
 * The shared data access layer is the code under test here, so the boundary
 * mocked is the global `fetch` (never the client itself). Contract this file pins:
 *
 * - `@/lib/api/client`
 *   - `get(endpoint, params?)` — requests go to the same-origin proxy path
 *     `/curve-data<endpoint>` when NEXT_PUBLIC_API_BASE_URL is unset (the default
 *     in constants.ts), never to http://localhost:10020 directly.
 *   - exports no write helpers (`post` / `put` / `patch` / `del`) — the service is
 *     read-only (BR5).
 *   - failures reject with a service error
 *     `{ status, description, retryable, kind: 'not-authorised' | 'service-error' }`;
 *     401/403 → kind 'not-authorised', retryable false; other failures →
 *     kind 'service-error', retryable true. The description carries the service's
 *     own `Message` (spec Message schema: `{ "Message": string }`) so the cause is
 *     never hidden (BR6).
 * - `@/lib/api/download` — `downloadFile(endpoint, params?)` fetches via GET through
 *   the same proxy and saves the body with the filename from the response's
 *   `Content-Disposition` header (anchor with `download` attribute + object URL).
 * - `@/lib/api/nullable-number` — `parseNullableNumber(raw)` returns a finite
 *   number, or `null` as the explicit "no value" state, for SizeBytes /
 *   RecordsInserted / ChangeBp.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// constants.ts reads the env at import time — clear it BEFORE the static imports
// below so the default (browser-facing) base URL is what gets exercised.
vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', undefined);
});

import * as client from '@/lib/api/client';
import { get } from '@/lib/api/client';
import { downloadFile } from '@/lib/api/download';
import { parseNullableNumber } from '@/lib/api/nullable-number';

const mockFetch = vi.fn<typeof fetch>();

function jsonResponse(
  body: unknown,
  status = 200,
  statusText = 'OK',
): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'content-type': 'application/json' },
  });
}

function requestedUrl(): string {
  const input = mockFetch.mock.lastCall?.[0];
  return typeof input === 'string' ? input : String(input);
}

function requestedMethod(): string {
  const init = mockFetch.mock.lastCall?.[1];
  return (init?.method ?? 'GET').toUpperCase();
}

describe('Epic app-shell-and-sign-in, Story 2: live data connection', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // AC-1
  it('sends every data read to the same-origin proxy path, not the data service address', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ FileCounts: { Total: 4, Current: 4, Failed: 0 } }),
    );

    await get('/v1/overview');

    expect(requestedUrl()).toBe('/curve-data/v1/overview');
    expect(requestedUrl()).not.toContain('localhost:10020');
  });

  // AC-2
  it('only issues read (GET) requests and offers no write helpers', async () => {
    expect(client).not.toHaveProperty('post');
    expect(client).not.toHaveProperty('put');
    expect(client).not.toHaveProperty('patch');
    expect(client).not.toHaveProperty('del');

    mockFetch.mockResolvedValueOnce(jsonResponse({ Curves: [] }));
    await get('/v1/curves', { Family: 'Nominal' });
    expect(requestedMethod()).toBe('GET');
  });

  // AC-3
  it('turns size, records-inserted and change-in-bp text into numbers or an explicit no value', () => {
    expect(parseNullableNumber('48213')).toBe(48213);
    expect(parseNullableNumber('250')).toBe(250);
    expect(parseNullableNumber('-3.5')).toBe(-3.5);
    expect(parseNullableNumber('0')).toBe(0);

    const noValueInputs: Array<string | null | undefined> = [
      null,
      undefined,
      '',
      '   ',
      'null',
      'NaN',
      'abc',
    ];
    noValueInputs.forEach((raw) => {
      expect(parseNullableNumber(raw)).toBeNull();
    });
  });

  // AC-4
  it('saves a downloaded original file or CSV export under the filename the service gives it', async () => {
    const savedNames: string[] = [];
    // jsdom has no object-URL support — supply inert stand-ins for this test only.
    URL.createObjectURL = () => 'blob:mock-download';
    URL.revokeObjectURL = () => undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      savedNames.push(this.download);
    });

    mockFetch.mockResolvedValueOnce(
      new Response(new Blob(['xlsx-bytes']), {
        status: 200,
        headers: {
          'content-type': 'application/octet-stream',
          'content-disposition':
            'attachment; filename="GLC Nominal daily data current month.xlsx"',
        },
      }),
    );
    await downloadFile('/v1/files/101/original');
    expect(requestedUrl()).toBe('/curve-data/v1/files/101/original');
    expect(savedNames).toEqual(['GLC Nominal daily data current month.xlsx']);

    mockFetch.mockResolvedValueOnce(
      new Response('Tenor,Rate\n1Y,4.12\n', {
        status: 200,
        headers: {
          'content-type': 'text/csv',
          'content-disposition':
            'attachment; filename="GlcNominalSpotCurve_2026-09-30.csv"',
        },
      }),
    );
    await downloadFile('/v1/curves/GlcNominalSpotCurve/rates.csv', {
      ObservationDate: '2026-09-30',
    });
    expect(requestedUrl()).toBe(
      '/curve-data/v1/curves/GlcNominalSpotCurve/rates.csv?ObservationDate=2026-09-30',
    );
    expect(savedNames).toEqual([
      'GLC Nominal daily data current month.xlsx',
      'GlcNominalSpotCurve_2026-09-30.csv',
    ]);
  });

  // AC-5
  it('reports a failed request as a service error and tells a not-authorised refusal apart', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        { Message: 'Database unavailable' },
        500,
        'Internal Server Error',
      ),
    );
    await expect(get('/v1/files')).rejects.toMatchObject({
      status: 500,
      kind: 'service-error',
      retryable: true,
      description: expect.stringContaining('Database unavailable'),
    });

    mockFetch.mockResolvedValueOnce(
      new Response(null, { status: 401, statusText: 'Unauthorized' }),
    );
    await expect(get('/v1/files')).rejects.toMatchObject({
      status: 401,
      kind: 'not-authorised',
      retryable: false,
      description: expect.stringMatching(/\S/),
    });

    mockFetch.mockResolvedValueOnce(
      new Response(null, { status: 403, statusText: 'Forbidden' }),
    );
    await expect(get('/v1/files')).rejects.toMatchObject({
      status: 403,
      kind: 'not-authorised',
      retryable: false,
    });
  });
});
