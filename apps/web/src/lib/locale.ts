import { DEFAULT_LOCALE, formatDate as formatDateIn } from "@blog/shared";
import { getI18nConfig } from "emdash";

export { DEFAULT_LOCALE };

/**
 * The default locale from the site's Astro `i18n` config, if it names a
 * language this runtime can format. Callers fall back to DEFAULT_LOCALE when
 * it's undefined.
 */
export function getSiteLocale(): string | undefined {
	const locale = getI18nConfig()?.defaultLocale;
	if (!locale) return undefined;
	try {
		return Intl.DateTimeFormat.supportedLocalesOf(locale)[0];
	} catch {
		// Malformed tags such as "pt_BR" throw instead of matching nothing.
		return undefined;
	}
}

/** BCP 47 tag for <html lang> and date formatting. */
export function getLocale(): string {
	return getSiteLocale() ?? DEFAULT_LOCALE;
}

/** Formats a date in the site's locale (English by default). */
export function formatDate(date: Date, month: "long" | "short"): string {
	return formatDateIn(date, month, getLocale());
}
