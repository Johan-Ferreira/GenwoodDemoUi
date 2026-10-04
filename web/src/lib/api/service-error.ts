import type {
  ServiceErrorKind,
  ServiceErrorShape,
  ServiceMessage,
} from '@/types/api';

/**
 * A failed data-service request. Carries the HTTP status, a plain-language
 * description that includes the service's own message (never hidden), whether
 * retrying can help, and whether it is a not-authorised refusal.
 */
export class ServiceError extends Error implements ServiceErrorShape {
  readonly status: number;
  readonly description: string;
  readonly retryable: boolean;
  readonly kind: ServiceErrorKind;

  constructor({ status, description, retryable, kind }: ServiceErrorShape) {
    super(description);
    this.name = 'ServiceError';
    this.status = status;
    this.description = description;
    this.retryable = retryable;
    this.kind = kind;
  }
}

/** True for anything shaped like a service error (class instance or plain object). */
export function isServiceError(value: unknown): value is ServiceErrorShape {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ServiceErrorShape>;
  return (
    typeof candidate.status === 'number' &&
    typeof candidate.description === 'string' &&
    typeof candidate.retryable === 'boolean' &&
    (candidate.kind === 'not-authorised' || candidate.kind === 'service-error')
  );
}

function isServiceMessage(value: unknown): value is ServiceMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Partial<ServiceMessage>).Message === 'string'
  );
}

/** Reads the service's `{ "Message": string }` body, if there is one. */
async function readServiceMessage(response: Response): Promise<string | null> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;
  try {
    const body: unknown = await response.json();
    if (isServiceMessage(body) && body.Message.trim() !== '') {
      return body.Message.trim();
    }
  } catch {
    // An unreadable body leaves the status line as the only detail.
  }
  return null;
}

function statusLabel(response: Response): string {
  return response.statusText
    ? `${response.status} ${response.statusText}`
    : String(response.status);
}

/** Maps a non-OK response to a ServiceError (401/403 → not-authorised). */
export async function serviceErrorFromResponse(
  response: Response,
): Promise<ServiceError> {
  const serviceMessage = await readServiceMessage(response);
  const detail = serviceMessage ? ` The service said: ${serviceMessage}` : '';

  if (response.status === 401 || response.status === 403) {
    return new ServiceError({
      status: response.status,
      description: `The data service did not authorise this request (${statusLabel(response)}).${detail}`,
      retryable: false,
      kind: 'not-authorised',
    });
  }

  return new ServiceError({
    status: response.status,
    description: `The data service could not complete the request (${statusLabel(response)}).${detail}`,
    retryable: true,
    kind: 'service-error',
  });
}

/** The service could not be reached at all (connection refused, proxy down). */
export function unreachableServiceError(cause: unknown): ServiceError {
  const reason =
    cause instanceof Error && cause.message ? ` (${cause.message})` : '';
  return new ServiceError({
    status: 0,
    description: `The data service could not be reached${reason}. Check that it is running, then try again.`,
    retryable: true,
    kind: 'service-error',
  });
}
