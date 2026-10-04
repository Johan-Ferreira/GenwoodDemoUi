/**
 * Data-service API type definitions shared by the client layer.
 */

export type QueryParamScalar = string | number | boolean;
export type QueryParams = Record<
  string,
  QueryParamScalar | ReadonlyArray<QueryParamScalar> | undefined
>;

/**
 * Error body the data service returns on 404/500 (spec schema `Message`).
 */
export interface ServiceMessage {
  Message: string;
}

/**
 * How a failed request is presented: a not-authorised refusal (401/403) gets
 * the access message; everything else gets the persistent service-error message.
 */
export type ServiceErrorKind = 'not-authorised' | 'service-error';

/**
 * Shape of a failed data-service request as seen by the UI.
 * `status` is 0 when the service could not be reached at all.
 */
export interface ServiceErrorShape {
  status: number;
  description: string;
  retryable: boolean;
  kind: ServiceErrorKind;
}
