import { SearchField } from "@heroui/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef } from "react";

interface Props {
	defaultValue?: string;
	placeholder?: string;
	/** Focus the field with ⌘K / Ctrl+K */
	shortcut?: boolean;
	/** Use the low-emphasis variant when the field sits on a surface */
	variant?: "primary" | "secondary";
	autoFocus?: boolean;
	className?: string;
}

/**
 * HeroUI SearchField inside a plain GET form, so search works before
 * hydration and the results page stays fully server-rendered.
 */
export default function SearchForm({
	defaultValue = "",
	placeholder = "Cari tulisan…",
	shortcut = false,
	variant = "primary",
	autoFocus = false,
	className,
}: Props) {
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!shortcut) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				inputRef.current?.focus();
				inputRef.current?.select();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [shortcut]);

	return (
		<form action="/search" method="get" role="search" className={className}>
			<SearchField
				aria-label="Cari tulisan"
				defaultValue={defaultValue}
				name="q"
				variant={variant}
				fullWidth
				autoFocus={autoFocus}
			>
				<SearchField.Group>
					<SearchField.SearchIcon>
						<HugeiconsIcon icon={Search01Icon} size={16} />
					</SearchField.SearchIcon>
					<SearchField.Input
						ref={inputRef}
						placeholder={placeholder}
						aria-keyshortcuts={shortcut ? "Meta+K Control+K" : undefined}
					/>
					<SearchField.ClearButton />
				</SearchField.Group>
			</SearchField>
		</form>
	);
}
