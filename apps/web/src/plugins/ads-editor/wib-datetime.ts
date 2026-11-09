export const WIB_TIME_ZONE = "Asia/Jakarta";

export interface WibDateTime {
	date: string;
	hour: string;
	minute: string;
}

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
	timeZone: WIB_TIME_ZONE,
	year: "numeric", month: "2-digit", day: "2-digit",
	hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/** Read an instant in WIB, independent of the browser or server time zone. */
export function toWibDateTime(value: unknown): WibDateTime | undefined {
	const instant = value instanceof Date ? value : typeof value === "string" &&
		/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? new Date(value) : undefined;
	if (!instant || !Number.isFinite(instant.getTime())) return undefined;
	const parts = Object.fromEntries(partsFormatter.formatToParts(instant).map(({ type, value }) => [type, value]));
	return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: parts.hour, minute: parts.minute };
}

/** WIB is UTC+07:00 year-round. A round trip rejects impossible calendar dates. */
export function fromWibDateTime({ date, hour, minute }: WibDateTime): string | undefined {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3])$/.test(hour) || !/^[0-5]\d$/.test(minute))
		return undefined;
	const instant = new Date(`${date}T${hour}:${minute}:00+07:00`);
	const roundTrip = toWibDateTime(instant);
	return roundTrip?.date === date && roundTrip.hour === hour && roundTrip.minute === minute
		? instant.toISOString() : undefined;
}

export function formatWibDateTime(value: unknown): string | undefined {
	const parts = toWibDateTime(value);
	if (!parts) return undefined;
	const day = new Intl.DateTimeFormat("en-US", {
		timeZone: WIB_TIME_ZONE, day: "numeric", month: "short", year: "numeric",
	}).format(new Date(`${parts.date}T00:00:00+07:00`));
	return `${day} · ${parts.hour}:${parts.minute} WIB`;
}
