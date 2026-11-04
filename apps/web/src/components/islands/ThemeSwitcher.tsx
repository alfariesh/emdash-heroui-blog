import { ComputerIcon, Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { ToggleButton, ToggleButtonGroup, Tooltip } from "@heroui/react";
import { useEffect, useState } from "react";

import { THEME_EVENT, isThemePreference, setThemePreference } from "../../lib/theme";
import type { ThemePreference } from "../../lib/theme";

interface Props {
	/** Read from the `theme` cookie on the server so SSR and hydration agree */
	initialPreference: ThemePreference;
}

const OPTIONS: { id: ThemePreference; label: string; icon: IconSvgElement }[] = [
	{ id: "light", label: "Terang", icon: Sun03Icon },
	{ id: "dark", label: "Gelap", icon: Moon02Icon },
	{ id: "system", label: "Ikuti sistem", icon: ComputerIcon },
];

/** Light / dark / system switch built on HeroUI's detached ToggleButtonGroup */
export default function ThemeSwitcher({ initialPreference }: Props) {
	const [preference, setPreference] = useState<ThemePreference>(initialPreference);

	// Stay in sync when another control (e.g. the header toggle) changes the theme
	useEffect(() => {
		const onChange = (event: Event) => {
			const next = (event as CustomEvent<{ preference: ThemePreference }>).detail?.preference;
			if (isThemePreference(next)) setPreference(next);
		};
		window.addEventListener(THEME_EVENT, onChange);
		return () => window.removeEventListener(THEME_EVENT, onChange);
	}, []);

	return (
		<ToggleButtonGroup
			aria-label="Tema warna"
			isDetached
			size="sm"
			selectionMode="single"
			disallowEmptySelection
			selectedKeys={[preference]}
			onSelectionChange={(keys) => {
				const [next] = [...keys];
				if (isThemePreference(next)) {
					setPreference(next);
					setThemePreference(next);
				}
			}}
		>
			{OPTIONS.map(({ id, label, icon }) => (
				<Tooltip key={id} delay={300}>
					<ToggleButton id={id} isIconOnly aria-label={label}>
						<HugeiconsIcon icon={icon} />
					</ToggleButton>
					<Tooltip.Content>{label}</Tooltip.Content>
				</Tooltip>
			))}
		</ToggleButtonGroup>
	);
}
