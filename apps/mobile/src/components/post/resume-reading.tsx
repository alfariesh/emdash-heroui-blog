import { GlassView } from "heroui-native/glass-view";
import { PressableFeedback } from "heroui-native/pressable-feedback";
import { Typography } from "heroui-native/text";
import { View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { BookOpenIcon, CloseIcon } from "@/lib/icons";

interface ResumeReadingProps {
	/** Share of the body read on the last visit, 0–1. */
	progress: number;
	onResume: () => void;
	onDismiss: () => void;
}

/**
 * Floating "Continue reading" pill at the bottom of the article: jumps back
 * to where the last visit ended. Glass like the top bar's buttons; the
 * layout animations follow the system's reduced-motion setting.
 */
export function ResumeReading({ progress, onResume, onDismiss }: ResumeReadingProps) {
	const { bottom } = useSafeAreaInsets();
	const percent = Math.round(progress * 100);

	return (
		<Animated.View
			entering={FadeInDown.duration(250)}
			exiting={FadeOutDown.duration(200)}
			pointerEvents="box-none"
			style={{ position: "absolute", left: 0, right: 0, bottom: bottom + 16, alignItems: "center" }}
		>
			<View className="flex-row items-center overflow-hidden rounded-full border border-border">
				<GlassView intensity={80} className="rounded-full" />
				<PressableFeedback
					onPress={onResume}
					accessibilityRole="button"
					accessibilityLabel={`Continue reading from ${percent}%`}
					className="flex-row items-center gap-2 py-2.5 ps-4 pe-1"
				>
					<Icon icon={BookOpenIcon} size={18} tone="accent" />
					<Typography type="body-sm" weight="semibold">
						Continue reading
					</Typography>
					<Typography type="body-sm" color="muted" className="tabular-nums">
						{`${percent}%`}
					</Typography>
				</PressableFeedback>
				<PressableFeedback
					onPress={onDismiss}
					accessibilityRole="button"
					accessibilityLabel="Close"
					hitSlop={6}
					className="me-1 size-9 items-center justify-center rounded-full"
				>
					<Icon icon={CloseIcon} size={16} tone="muted" />
				</PressableFeedback>
			</View>
		</Animated.View>
	);
}
