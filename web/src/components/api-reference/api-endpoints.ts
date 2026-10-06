/** API reference content: subtitle, endpoint rows and the example request line. */

export const API_REFERENCE_SUBTITLE =
  'The same governed data is available to actuarial models from the live, read-only data service. No authorisation required.';

export interface ApiEndpoint {
  method: 'GET';
  path: string;
}

/** The four endpoints the design shows, with their live /v1 paths. */
export const API_ENDPOINTS: readonly ApiEndpoint[] = [
  { method: 'GET', path: '/v1/curves' },
  { method: 'GET', path: '/v1/curves/{Code}/tenors' },
  { method: 'GET', path: '/v1/curves/{Code}/rates?ObservationDate={Date}' },
  { method: 'GET', path: '/v1/imports/{Woid}' },
];

/** "GET {service}/v1/curves/{code}/rates?ObservationDate={date}". */
export function exampleRequestLine(
  serviceBase: string,
  code: string,
  date: string,
): string {
  const query = new URLSearchParams({ ObservationDate: date }).toString();
  return `GET ${serviceBase}/v1/curves/${encodeURIComponent(code)}/rates?${query}`;
}
