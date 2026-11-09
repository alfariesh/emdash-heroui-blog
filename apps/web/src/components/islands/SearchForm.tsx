import { SearchField } from "@heroui/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface Props {
	defaultValue?: string;
	placeholder?: string;
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
	placeholder = "Search posts…",
	variant = "primary",
	autoFocus = false,
	className,
}: Props) {
	return (
		<form action="/search" method="get" role="search" className={className}>
			<SearchField
				aria-label="Search posts"
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
					<SearchField.Input placeholder={placeholder} />
					<SearchField.ClearButton />
				</SearchField.Group>
			</SearchField>
		</form>
	);
}
