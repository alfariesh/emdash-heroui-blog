import assert from "node:assert/strict";
import { test } from "node:test";
import { formatWibDateTime, fromWibDateTime, toWibDateTime } from "./wib-datetime.ts";

test("WIB calendar and clock convert across UTC days, months, and years", () => {
	for (const [date, hour, minute, utc] of [
		["2026-11-09", "11", "52", "2026-11-09T04:52:00.000Z"],
		["2027-01-01", "00", "15", "2026-12-31T17:15:00.000Z"],
		["2028-03-01", "00", "00", "2028-02-29T17:00:00.000Z"],
	]) {
		const parts = { date, hour, minute };
		assert.equal(fromWibDateTime(parts), utc);
		assert.deepEqual(toWibDateTime(utc), parts);
		assert.deepEqual(toWibDateTime(new Date(utc)), parts);
	}
	assert.deepEqual(toWibDateTime("2026-11-09T01:52:00-03:00"), { date: "2026-11-09", hour: "11", minute: "52" });
});

test("missing and malformed values never become a different scheduled instant", () => {
	for (const value of [null, undefined, "", "invalid", 0, "2026-11-09T11:52", new Date(NaN)]) {
		assert.equal(toWibDateTime(value), undefined);
	}
	for (const parts of [
		{ date: "2026-02-29", hour: "00", minute: "00" },
		{ date: "2026-11-31", hour: "12", minute: "30" },
		{ date: "2026-11-09", hour: "24", minute: "00" },
		{ date: "2026-11-09", hour: "12", minute: "60" },
	]) assert.equal(fromWibDateTime(parts), undefined);
	assert.equal(formatWibDateTime("2026-11-09T04:52:00Z"), "Nov 9, 2026 · 11:52 WIB");
});
