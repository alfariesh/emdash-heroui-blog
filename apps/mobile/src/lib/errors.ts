import { BlogApiError } from "@blog/shared";

/** True for a 404 from the API (unknown slug, draft, unpublished). */
export function isNotFound(error: unknown): boolean {
	return error instanceof BlogApiError && error.status === 404;
}

/** Client errors (4xx) will not succeed on a retry; network and 5xx errors might. */
export function isRetryable(error: unknown): boolean {
	if (!(error instanceof BlogApiError)) return true;
	return error.status === 0 || error.status >= 500;
}

/**
 * Visitor-facing message. API messages are already Indonesian and safe to
 * show (see ApiErrorBody); anything else gets a generic one.
 */
export function errorMessage(error: unknown): string {
	if (error instanceof BlogApiError) return error.message;
	return "Terjadi kesalahan. Silakan coba lagi.";
}
