import { Button, DatePicker, Popover, Select } from "@cloudflare/kumo";
import { useState } from "react";
import { formatWibDateTime, fromWibDateTime, toWibDateTime, WIB_TIME_ZONE } from "./wib-datetime";

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

function WibDateTimeField({ value, onChange, label, id, required, minimal }: FieldWidgetProps) {
	const [open, setOpen] = useState(false);
	const parts = toWibDateTime(value);
	const selected = parts ? new Date(`${parts.date}T${parts.hour}:${parts.minute}:00+07:00`) : undefined;
	const invalid = value !== undefined && value !== null && value !== "" && !parts;
	const labelId = `${id}-label`;
	const helpId = `${id}-help`;

	function change(date = parts?.date, hour = parts?.hour ?? "00", minute = parts?.minute ?? "00") {
		if (!date) return;
		const next = fromWibDateTime({ date, hour, minute });
		if (next) onChange(next);
	}

	return (
		<div className="grid gap-2" role="group" aria-labelledby={labelId}>
			<span id={labelId} className={minimal ? "sr-only" : "text-sm font-medium"}>
				{label}{required ? " *" : ""}
			</span>
			<div className="flex flex-wrap items-center gap-2">
				<Popover open={open} onOpenChange={setOpen}>
					<Popover.Trigger render={<Button type="button" variant="secondary" id={id} />}
						aria-labelledby={`${labelId} ${id}-value`} aria-describedby={helpId}>
						<span id={`${id}-value`}>{formatWibDateTime(value) ?? "Choose date and time"}</span>
					</Popover.Trigger>
					<Popover.Content align="start" className="max-w-[calc(100vw-2rem)] p-3">
						<Popover.Title className="mb-2 text-sm font-medium">{label}</Popover.Title>
						<DatePicker mode="single" timeZone={WIB_TIME_ZONE} selected={selected}
							defaultMonth={selected} required={Boolean(selected)}
							onChange={(day: Date | undefined) => { if (day) change(toWibDateTime(day)?.date); }} />
						<div className="mt-3 flex items-end gap-2">
							<Select label="Hour" value={parts?.hour ?? "00"} disabled={!parts}
								onValueChange={(hour) => { if (hour !== null) change(parts?.date, hour); }}>
								{hours.map((hour) => <Select.Option key={hour} value={hour}>{hour}</Select.Option>)}
							</Select>
							<Select label="Minute" value={parts?.minute ?? "00"} disabled={!parts}
								onValueChange={(minute) => { if (minute !== null) change(parts?.date, parts?.hour, minute); }}>
								{minutes.map((minute) => <Select.Option key={minute} value={minute}>{minute}</Select.Option>)}
							</Select>
							<span className="pb-2 text-sm text-kumo-subtle">WIB</span>
						</div>
						<div className="mt-3 flex justify-end">
							<Popover.Close render={<Button type="button" variant="secondary" />}>Done</Popover.Close>
						</div>
					</Popover.Content>
				</Popover>
				{value !== undefined && value !== null && value !== "" && !required &&
					<Button type="button" variant="ghost" onClick={() => onChange(null)} aria-label={`Clear ${label}`}>Clear</Button>}
			</div>
			<p id={helpId} className="text-xs text-kumo-subtle">WIB (UTC+07:00) · Asia/Jakarta. Leave empty for no time limit.</p>
			{invalid && <p role="alert" className="text-sm text-kumo-danger">Invalid date. Choose a date or clear this field.</p>}
		</div>
	);
}

export const fields = { "wib-datetime": WibDateTimeField };
