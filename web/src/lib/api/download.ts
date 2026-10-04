/**
 * File downloads from the data service (original xlsx files, CSV exports).
 *
 * The JSON client cannot carry binary bodies, so this sits beside it and shares
 * its proxy URL building and error mapping via `requestFromService`. The file
 * is saved under the name the service gives it in Content-Disposition.
 */

import { requestFromService } from '@/lib/api/client';
import type { QueryParams } from '@/types/api';

/**
 * Extracts the filename from a Content-Disposition header. Prefers the RFC 5987
 * `filename*=UTF-8''...` form, then the plain `filename="..."` form.
 */
export function filenameFromContentDisposition(
  header: string | null,
): string | null {
  if (!header) return null;

  const extended = /filename\*\s*=\s*([^']*)''([^;]+)/i.exec(header);
  if (extended) {
    try {
      return decodeURIComponent(extended[2].trim().replace(/^"|"$/g, ''));
    } catch {
      // Malformed encoding — fall through to the plain form.
    }
  }

  const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(header);
  if (plain) {
    const name = (plain[2] ?? plain[1]).trim();
    return name || null;
  }

  return null;
}

/** Last path segment of the endpoint — used only when the service names no file. */
function fallbackFilename(endpoint: string): string {
  const segments = endpoint.split('?')[0].split('/').filter(Boolean);
  return segments[segments.length - 1] ?? 'download';
}

function saveBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // Revoking in the same tick can cancel the download in Firefox/Safari.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

/**
 * Downloads a file from the data service and saves it in the browser.
 * Rejects with a ServiceError on failure (same mapping as `get`).
 *
 * @returns the filename the file was saved under
 */
export async function downloadFile(
  endpoint: string,
  params?: QueryParams,
): Promise<string> {
  const response = await requestFromService(endpoint, params);
  const filename =
    filenameFromContentDisposition(
      response.headers.get('content-disposition'),
    ) ?? fallbackFilename(endpoint);
  const blob = await response.blob();
  saveBlob(blob, filename);
  return filename;
}
