/** Language for visitor-facing text and dates, as a BCP 47 tag. */
export const DEFAULT_LOCALE = "id-ID";

/** Formats a date such as "4 November 2026" (long) or "4 Nov 2026" (short). */
export function formatDate(
	date: Date | string,
	month: "long" | "short" = "long",
	locale: string = DEFAULT_LOCALE,
): string {
	const value = typeof date === "string" ? new Date(date) : date;
	return value.toLocaleDateString(locale, {
		year: "numeric",
		month,
		day: "numeric",
	});
}
