/** Language for visitor-facing text and dates, as a BCP 47 tag. */
export const DEFAULT_LOCALE = "en-US";

/**
 * "1 post", "2 posts". English plural rule only: revisit it if another locale
 * is ever supported. Pass the plural when it is not the singular plus "s".
 */
export function formatCount(count: number, singular: string, plural: string = `${singular}s`): string {
	return `${count} ${count === 1 ? singular : plural}`;
}

/** Formats a date such as "November 4, 2026" (long) or "Nov 4, 2026" (short). */
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
