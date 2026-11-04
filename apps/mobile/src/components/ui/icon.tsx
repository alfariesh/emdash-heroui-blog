import { HugeiconsIcon } from "@hugeicons/react-native";
import { withUniwind } from "uniwind";
import type { IconSvgElement } from "@/lib/icons";

const StyledHugeicon = withUniwind(HugeiconsIcon);

/**
 * Icon colours are theme tokens. RN SVG has no `currentColor` inheritance
 * from a parent Text, so every icon names its tone explicitly. The strings
 * are static so Tailwind can see them.
 */
const TONE_CLASS = {
	foreground: "accent-foreground",
	muted: "accent-muted",
	accent: "accent-accent",
	"on-accent": "accent-accent-foreground",
	danger: "accent-danger",
	white: "accent-white",
} as const;

export type IconTone = keyof typeof TONE_CLASS;

interface IconProps {
	icon: IconSvgElement;
	size?: number;
	strokeWidth?: number;
	tone?: IconTone;
	className?: string;
}

/** A Hugeicons icon in a theme colour. Decorative by default (hidden from screen readers). */
export function Icon({ icon, size = 20, strokeWidth = 1.75, tone = "foreground", className }: IconProps) {
	return (
		<StyledHugeicon
			icon={icon}
			size={size}
			strokeWidth={strokeWidth}
			colorClassName={TONE_CLASS[tone]}
			className={className}
			accessible={false}
			importantForAccessibility="no"
		/>
	);
}
