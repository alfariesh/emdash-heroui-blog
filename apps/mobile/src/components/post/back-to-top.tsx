import { GlassView } from "heroui-native/glass-view";
import { useThemeColor } from "heroui-native/hooks";
import { PressableFeedback } from "heroui-native/pressable-feedback";
import { useState } from "react";
import { View } from "react-native";
import Animated, {
	FadeInDown,
	FadeOutDown,
	useAnimatedProps,
	useAnimatedReaction,
	type DerivedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import { Icon } from "@/components/ui/icon";
import { ArrowUpIcon } from "@/lib/icons";

const SIZE = 48;
const STROKE_WIDTH = 2.5;
const CENTER = SIZE / 2;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface BackToTopProps {
	/** Vertical scroll offset of the article. */
	scrollY: DerivedValue<number>;
	/** 0–1 share of the article read, drawn as the ring around the button. */
	progress: DerivedValue<number>;
	/** Offset past which the button appears. */
	showAfter: number;
	/** Keeps the button away while another control holds the bottom of the screen. */
	suspended?: boolean;
	onPress: () => void;
}

/**
 * Floating back-to-top button with a reading-progress ring. The ring runs on
 * the UI thread; only crossing `showAfter` reaches JS.
 */
export function BackToTop({ scrollY, progress, showAfter, suspended = false, onPress }: BackToTopProps) {
	const { bottom } = useSafeAreaInsets();
	const [track, accent] = useThemeColor(["border", "accent"]);
	const [scrolled, setScrolled] = useState(false);

	useAnimatedReaction(
		() => scrollY.get() >= showAfter,
		(isScrolled, wasScrolled) => {
			if (isScrolled !== wasScrolled) scheduleOnRN(setScrolled, isScrolled);
		},
		[showAfter],
	);

	const ringProps = useAnimatedProps(() => ({
		strokeDashoffset: CIRCUMFERENCE * (1 - progress.get()),
	}));

	if (!scrolled || suspended) return null;

	return (
		<Animated.View
			entering={FadeInDown.duration(220)}
			exiting={FadeOutDown.duration(180)}
			className="absolute end-4"
			style={{ bottom: bottom + 16 }}
		>
			<PressableFeedback
				onPress={onPress}
				accessibilityRole="button"
				accessibilityLabel="Back to top"
				hitSlop={6}
				className="size-12 items-center justify-center overflow-hidden rounded-full"
			>
				<GlassView intensity={80} className="rounded-full" />
				{/* Rotated so the ring starts at twelve o'clock. */}
				<Svg
					width={SIZE}
					height={SIZE}
					pointerEvents="none"
					style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
				>
					<Circle cx={CENTER} cy={CENTER} r={RADIUS} stroke={track} strokeWidth={STROKE_WIDTH} fill="none" />
					<AnimatedCircle
						cx={CENTER}
						cy={CENTER}
						r={RADIUS}
						stroke={accent}
						strokeWidth={STROKE_WIDTH}
						strokeLinecap="round"
						strokeDasharray={CIRCUMFERENCE}
						fill="none"
						animatedProps={ringProps}
					/>
				</Svg>
				{/* A View keeps the icon above the absolute glass layer on every renderer. */}
				<View pointerEvents="none">
					<Icon icon={ArrowUpIcon} size={20} strokeWidth={1.9} tone="foreground" />
				</View>
			</PressableFeedback>
		</Animated.View>
	);
}
