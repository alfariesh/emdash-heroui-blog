import { Temporal } from "@js-temporal/polyfill";

export interface LocalDateTime {
	date: string;
	hour: string;
	minute: string;
}

export function resolveTimeZone(value: unknown): string {
	const zone = typeof value === "string" && value.trim() ? value.trim() : "UTC";
	// The CMS setting is an IANA zone, rather than a fixed numeric offset.
	if (/^[+-]/.test(zone)) throw new RangeError("Choose an IANA timezone in Settings → General.");
	return new Intl.DateTimeFormat("en-US", { timeZone: zone }).resolvedOptions().timeZone;
}

function zonedInstant(value: unknown, timeZone: string) {
	try {
		const instant = value instanceof Date
			? Temporal.Instant.fromEpochMilliseconds(value.getTime())
			: typeof value === "string" ? Temporal.Instant.from(value) : undefined;
		return instant?.toZonedDateTimeISO(timeZone);
	} catch {
		return undefined;
	}
}

/** Read an instant in the configured zone, independent of the computer's zone. */
export function toLocalDateTime(value: unknown, timeZone: string): LocalDateTime | undefined {
	const zoned = zonedInstant(value, timeZone);
	return zoned ? {
		date: zoned.toPlainDate().toString(),
		hour: String(zoned.hour).padStart(2, "0"),
		minute: String(zoned.minute).padStart(2, "0"),
	} : undefined;
}

export interface ScheduleInstant {
	utc: string;
	offset: string;
}

type LocalResolution = {
	kind: "valid" | "invalid" | "gap";
	instants: ScheduleInstant[];
};

/** Reject skipped clock times and expose both occurrences when clocks repeat. */
export function resolveLocalDateTime({ date, hour, minute }: LocalDateTime, timeZone: string): LocalResolution {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3])$/.test(hour) || !/^[0-5]\d$/.test(minute))
		return { kind: "invalid", instants: [] };
	try {
		const local = Temporal.PlainDateTime.from(`${date}T${hour}:${minute}`, { overflow: "reject" });
		const candidates = (["earlier", "later"] as const).map((disambiguation) =>
			local.toZonedDateTime(timeZone, { disambiguation }));
		const instants = candidates
			.filter((candidate) => candidate.toPlainDateTime().equals(local))
			.filter((candidate, index, all) => all.findIndex((item) => item.epochNanoseconds === candidate.epochNanoseconds) === index)
			.map((candidate) => ({ utc: candidate.toInstant().toString({ fractionalSecondDigits: 3 }), offset: candidate.offset }));
		return { kind: instants.length ? "valid" : "gap", instants };
	} catch {
		return { kind: "invalid", instants: [] };
	}
}

export function zoneLabel(value: unknown, timeZone: string): string {
	const offset = zonedInstant(value, timeZone)?.offset;
	const name = timeZone === "Asia/Jakarta" ? "WIB" : timeZone;
	return offset ? `${name} (UTC${offset})` : name;
}

export function formatScheduleDateTime(value: unknown, timeZone: string): string | undefined {
	const zoned = zonedInstant(value, timeZone);
	const parts = toLocalDateTime(value, timeZone);
	if (!zoned || !parts) return undefined;
	const day = new Intl.DateTimeFormat("en-US", {
		timeZone, day: "numeric", month: "short", year: "numeric",
	}).format(new Date(zoned.epochMilliseconds));
	return `${day} · ${parts.hour}:${parts.minute} ${zoneLabel(value, timeZone)}`;
}
