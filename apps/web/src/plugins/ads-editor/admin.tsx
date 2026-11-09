import { Button, DatePicker, Popover, Select } from "@cloudflare/kumo";
import { fetchManifest } from "@emdash-cms/admin";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatScheduleDateTime, resolveLocalDateTime, resolveTimeZone, toLocalDateTime, zoneLabel, type LocalDateTime } from "./schedule-datetime";

interface FieldWidgetProps {
	value: unknown;
	onChange: (value: unknown) => void;
	label: string;
	id: string;
	required?: boolean;
	minimal?: boolean;
}

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function ScheduleDateTimeField({ value, onChange, label, id, required, minimal }: FieldWidgetProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState<{ value: string; parts: LocalDateTime; timeZone: string }>();
	// Both fields share one request. Read the manifest, which every CMS editor can
	// access, rather than the settings endpoint restricted to administrators.
	const timezoneQuery = useQuery({
		queryKey: ["ads-editor", "timezone"],
		queryFn: async () => resolveTimeZone((await fetchManifest()).timezone),
		staleTime: 0,
		refetchOnWindowFocus: "always",
		retry: 1,
	});
	const timeZone = timezoneQuery.data ?? "UTC";
	const busy = timezoneQuery.isFetching || !timezoneQuery.isSuccess;
	const parsed = toLocalDateTime(value, timeZone);
	const parts = pending && pending.value === value && pending.timeZone === timeZone ? pending.parts : parsed;
	const resolution = parts ? resolveLocalDateTime(parts, timeZone) : undefined;
	const choices = resolution?.instants ?? [];
	const selectedInstant = parsed && typeof value === "string" ? value : choices[0]?.utc ?? (parts &&
		resolveLocalDateTime({ ...parts, hour: "12", minute: "00" }, timeZone).instants[0]?.utc);
	const selected = selectedInstant ? new Date(selectedInstant) : undefined;
	const zone = zoneLabel(selectedInstant ?? new Date(), timeZone);
	const zoneDescription = zone.startsWith(timeZone) ? zone : `${timeZone} · ${zone}`;
	const invalid = value !== undefined && value !== null && value !== "" && !parsed;
	const error = !invalid ? undefined : resolution?.kind === "gap"
		? "This local time does not exist because the clock changes. Choose another time."
		: choices.length > 1 ? "This time occurs twice. Choose a UTC offset."
		: "Invalid date. Choose a date or clear this field.";
	const labelId = `${id}-label`;
	const helpId = `${id}-help`;

	function change(date = parts?.date, hour = parts?.hour ?? "00", minute = parts?.minute ?? "00") {
		if (busy || !date) return;
		const next = { date, hour, minute };
		const result = resolveLocalDateTime(next, timeZone);
		if (result.instants.length === 1) {
			setPending(undefined);
			onChange(result.instants[0].utc);
		} else {
			// An offset-less value deliberately fails EmDash's datetime validation:
			// an incomplete DST choice must never save the previous instant instead.
			const draft = `${date}T${hour}:${minute}`;
			setPending({ value: draft, parts: next, timeZone });
			onChange(draft);
		}
	}

	return (
		<div className="grid gap-2" role="group" aria-labelledby={labelId}>
			<span id={labelId} className={minimal ? "sr-only" : "text-sm font-medium"}>
				{label}{required ? " *" : ""}
			</span>
			<div className="flex flex-wrap items-center gap-2">
				<Popover open={open} onOpenChange={setOpen}>
					<Popover.Trigger render={<Button type="button" variant="secondary" id={id} disabled={busy}
						className="h-auto min-h-9 max-w-full whitespace-normal text-start" />}
						aria-invalid={invalid || undefined} aria-labelledby={`${labelId} ${id}-value`} aria-describedby={helpId}>
						<span id={`${id}-value`}>{!timezoneQuery.isSuccess ? (timezoneQuery.isError ? "Timezone unavailable" : "Loading timezone…") :
							formatScheduleDateTime(value, timeZone) ?? (parts ? `${parts.date} · ${parts.hour}:${parts.minute}` : "Choose date and time")}</span>
					</Popover.Trigger>
					<Popover.Content align="start" className="max-w-[calc(100vw-2rem)] p-3">
						<Popover.Title className="mb-2 text-sm font-medium">{label}</Popover.Title>
						<DatePicker key={timeZone} mode="single" timeZone={timeZone} selected={selected} disabled={busy}
							defaultMonth={selected} required={Boolean(selected)}
							onChange={(day: Date | undefined) => { if (day) change(toLocalDateTime(day, timeZone)?.date); }} />
						<div className="mt-3 flex items-end gap-2">
							<Select label="Hour" value={parts?.hour ?? "00"} disabled={busy || !parts}
								onValueChange={(hour) => { if (hour !== null) change(parts?.date, hour); }}>
								{hours.map((hour) => <Select.Option key={hour} value={hour}>{hour}</Select.Option>)}
							</Select>
							<Select label="Minute" value={parts?.minute ?? "00"} disabled={busy || !parts}
								onValueChange={(minute) => { if (minute !== null) change(parts?.date, parts?.hour, minute); }}>
								{minutes.map((minute) => <Select.Option key={minute} value={minute}>{minute}</Select.Option>)}
							</Select>
						</div>
						{choices.length > 1 && <div className="mt-3">
							<Select label="UTC offset" required placeholder="Choose occurrence" disabled={busy}
								value={parsed ? choices.find((choice) => zoneLabel(choice.utc, timeZone) === zoneLabel(value, timeZone))?.utc ?? null : null}
								onValueChange={(utc) => {
									if (!busy && choices.some((choice) => choice.utc === utc)) { setPending(undefined); onChange(utc); }
								}}>
								{choices.map((choice, index) => <Select.Option key={choice.utc} value={choice.utc}>
									UTC{choice.offset} ({index === 0 ? "first" : "second"} occurrence)
								</Select.Option>)}
							</Select>
						</div>}
						{error && <p role="alert" className="mt-3 text-sm text-kumo-danger">{error}</p>}
						<div className="mt-3 flex justify-end">
							<Popover.Close render={<Button type="button" variant="secondary" />}>Done</Popover.Close>
						</div>
					</Popover.Content>
				</Popover>
				{value !== undefined && value !== null && value !== "" && !required &&
					<Button type="button" variant="ghost" disabled={busy} onClick={() => { setPending(undefined); onChange(null); }}
						aria-label={`Clear ${label}`}>Clear</Button>}
			</div>
			<p id={helpId} className="text-xs text-kumo-subtle">
				{timezoneQuery.isPending ? "Loading CMS timezone…" : timezoneQuery.isSuccess
					? `${zoneDescription}. Change in Settings → General. Leave empty for no time limit.`
					: "Could not load the CMS timezone. Retry before editing the schedule."}
			</p>
			{timezoneQuery.isError && <Button type="button" variant="secondary" size="sm" onClick={() => { void timezoneQuery.refetch(); }}>Retry timezone</Button>}
			{error && !open && <p role="alert" className="text-sm text-kumo-danger">{error}</p>}
		</div>
	);
}

// Existing databases keep this widget key until setup:ads installs the new one.
export const fields = { datetime: ScheduleDateTimeField, "wib-datetime": ScheduleDateTimeField };
