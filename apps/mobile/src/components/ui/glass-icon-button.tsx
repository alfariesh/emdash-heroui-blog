import { GlassView } from "heroui-native/glass-view";
import { PressableFeedback } from "heroui-native/pressable-feedback";
import { cn } from "heroui-native/utils";
import { View } from "react-native";
import type { IconSvgElement } from "@/lib/icons";
import { Icon, type IconTone } from "./icon";

interface GlassIconButtonProps {
	icon: IconSvgElement;
	accessibilityLabel: string;
	onPress: () => void;
	tone?: IconTone;
	/** Selected state, e.g. a saved bookmark (announced to screen readers). */
	selected?: boolean;
	className?: string;
}

/** Round, frosted icon button that floats over images and content. */
export function GlassIconButton({
	icon,
	accessibilityLabel,
	onPress,
	tone = "foreground",
	selected,
	className,
}: GlassIconButtonProps) {
	return (
		<PressableFeedback
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={selected === undefined ? undefined : { selected }}
			hitSlop={6}
			className={cn("size-10 items-center justify-center overflow-hidden rounded-full border border-border", className)}
		>
			<GlassView intensity={70} className="rounded-full" />
			{/* A View keeps the icon above the absolute glass layer on every renderer. */}
			<View pointerEvents="none">
				<Icon icon={icon} size={20} strokeWidth={1.9} tone={tone} />
			</View>
		</PressableFeedback>
	);
}
