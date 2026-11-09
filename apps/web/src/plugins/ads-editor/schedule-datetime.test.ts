import assert from "node:assert/strict";
import { test } from "node:test";
import { formatScheduleDateTime, resolveLocalDateTime, resolveTimeZone, toLocalDateTime } from "./schedule-datetime.ts";

test("unset sites use UTC, while configured IANA zones are validated", () => {
	for (const value of [undefined, null, "", "  "]) assert.equal(resolveTimeZone(value), "UTC");
	assert.equal(resolveTimeZone("Asia/Jakarta"), "Asia/Jakarta");
	for (const value of ["invalid", "+07:00"]) assert.throws(() => resolveTimeZone(value), RangeError);
});

test("WIB instants stay unchanged, including UTC day and year boundaries", () => {
	for (const [date, hour, minute, utc] of [
		["2026-11-09", "11", "52", "2026-11-09T04:52:00.000Z"],
		["2027-01-01", "00", "15", "2026-12-31T17:15:00.000Z"],
		["2028-03-01", "00", "00", "2028-02-29T17:00:00.000Z"],
	]) {
		const parts = { date, hour, minute };
		assert.deepEqual(resolveLocalDateTime(parts, "Asia/Jakarta"), { kind: "valid", instants: [{ utc, offset: "+07:00" }] });
		assert.deepEqual(toLocalDateTime(utc, "Asia/Jakarta"), parts);
		assert.deepEqual(toLocalDateTime(new Date(utc), "Asia/Jakarta"), parts);
	}
	assert.equal(formatScheduleDateTime("2026-11-09T04:52:00Z", "Asia/Jakarta"), "Nov 9, 2026 · 11:52 WIB (UTC+07:00)");
});

test("UTC, negative, fractional and seasonal offsets convert independently of the host", () => {
	const parts = { date: "2026-07-01", hour: "12", minute: "30" };
	for (const [zone, utc] of [
		["UTC", "2026-07-01T12:30:00.000Z"],
		["America/New_York", "2026-07-01T16:30:00.000Z"],
		["Asia/Kathmandu", "2026-07-01T06:45:00.000Z"],
		["Australia/Adelaide", "2026-07-01T03:00:00.000Z"],
	]) {
		assert.equal(resolveLocalDateTime(parts, zone).instants[0]?.utc, utc);
		assert.deepEqual(toLocalDateTime(utc, zone), parts);
	}
	assert.equal(resolveLocalDateTime({ ...parts, date: "2026-01-01" }, "America/New_York").instants[0]?.offset, "-05:00");
});

test("nonexistent dates and DST gaps never become another scheduled time", () => {
	for (const value of [undefined, null, "", "invalid", 0, "2026-11-09T11:52", "2026-02-30T12:00:00Z", new Date(NaN)])
		assert.equal(toLocalDateTime(value, "UTC"), undefined);
	for (const parts of [
		{ date: "2026-02-29", hour: "00", minute: "00" },
		{ date: "2026-11-31", hour: "12", minute: "30" },
		{ date: "2026-11-09", hour: "24", minute: "00" },
		{ date: "2026-11-09", hour: "12", minute: "60" },
	]) assert.equal(resolveLocalDateTime(parts, "UTC").kind, "invalid");
	assert.equal(resolveLocalDateTime({ date: "2026-03-08", hour: "02", minute: "30" }, "America/New_York").kind, "gap");
	assert.equal(resolveLocalDateTime({ date: "2011-12-30", hour: "12", minute: "00" }, "Pacific/Apia").kind, "gap");
});

test("repeated DST times expose both UTC instants, including half-hour clock changes", () => {
	assert.deepEqual(resolveLocalDateTime({ date: "2026-11-01", hour: "01", minute: "30" }, "America/New_York").instants, [
		{ utc: "2026-11-01T05:30:00.000Z", offset: "-04:00" },
		{ utc: "2026-11-01T06:30:00.000Z", offset: "-05:00" },
	]);
	const fold = resolveLocalDateTime({ date: "2026-04-05", hour: "01", minute: "45" }, "Australia/Lord_Howe").instants;
	assert.equal(fold.length, 2);
	assert.equal(Date.parse(fold[1].utc) - Date.parse(fold[0].utc), 30 * 60_000);
});
