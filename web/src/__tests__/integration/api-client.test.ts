/**
 * Integration Test: data-service client
 *
 * Covers the read client's behaviour beyond the story 2 acceptance tests:
 * query-string building for filters, the "file not found" 404 body, and an
 * unreachable service. The boundary mocked is the global `fetch`.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', undefined);
});

import { get } from '@/lib/api/client';

const mockFetch = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200, statusText = 'OK') {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Data-service client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the parsed body of a successful read', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ Curves: [{ Code: 'A' }] }));

    const result = await get<{ Curves: Array<{ Code: string }> }>('/v1/curves');

    expect(result).toEqual({ Curves: [{ Code: 'A' }] });
  });

  it('sends set filters, repeats list filters and leaves out cleared ones', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ Files: [] }));

    await get('/v1/files', {
      Status: 'Failed',
      CurveFamily: ['Nominal', 'Real'],
      ReceivedFrom: undefined,
      Page: 2,
    });

    expect(mockFetch.mock.lastCall?.[0]).toBe(
      '/curve-data/v1/files?Status=Failed&CurveFamily=Nominal&CurveFamily=Real&Page=2',
    );
  });

  it("reports the service's own message when a file is not found", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ Message: 'File not found' }, 404, 'Not Found'),
    );

    await expect(get('/v1/files/999')).rejects.toMatchObject({
      status: 404,
      kind: 'service-error',
      description: expect.stringContaining('File not found'),
    });
  });

  it('reports an unreachable service as a retryable service error', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(get('/v1/overview')).rejects.toMatchObject({
      status: 0,
      kind: 'service-error',
      retryable: true,
      description: expect.stringContaining('could not be reached'),
    });
  });
});
