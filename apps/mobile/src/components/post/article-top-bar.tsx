import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Typography } from "heroui-native/text";
import { useState, type ReactNode } from "react";
import { View } from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	useAnimatedReaction,
	useAnimatedStyle,
	type DerivedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { useUniwind } from "uniwind";
import { GlassIconButton } from "@/components/ui/glass-icon-button";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { ArrowLeftIcon } from "@/lib/icons";

export const TOP_BAR_HEIGHT = 56;
/** How far the blur dissolves below the bar. */
const BLUR_TAIL = 32;
/** Scroll distance before and after `titleAt` over which the bar's title arrives. */
const TITLE_LEAD = 12;
const TITLE_TRAIL = 24;

interface ArticleTopBarProps {
	title: string;
	/** Vertical scroll offset of the article. */
	scrollY: DerivedValue<number>;
	/** Offset at which the bar turns solid (the bottom of the hero image, or ~0). */
	solidAt: number;
	/** Offset at which the article's own heading has slid under the bar; 0 until measured. */
	titleAt: DerivedValue<number>;
	/** The bar starts over a photo: light status bar until it turns solid. */
	overImage?: boolean;
	actions?: ReactNode;
}

/**
 * Floating top bar for the article screen. Over the hero it is just three
 * glass buttons; as the hero scrolls away a progressive blur fades in, and the
 * title rises into the bar as the article's heading disappears under it. All
 * driven on the UI thread from the scroll offset.
 */
export function ArticleTopBar({
	title,
	scrollY,
	solidAt,
	titleAt,
	overImage = false,
	actions,
}: ArticleTopBarProps) {
	const { top } = useSafeAreaInsets();
	const { theme } = useUniwind();
	const fadeStart = Math.max(0, solidAt - 48);

	// Crossing the threshold is the only event that reaches JS (for the status bar).
	const [solid, setSolid] = useState(false);
	useAnimatedReaction(
		() => scrollY.get() >= solidAt,
		(isSolid, wasSolid) => {
			if (isSolid !== wasSolid) scheduleOnRN(setSolid, isSolid);
		},
		[solidAt],
	);
	const statusBarStyle = overImage && !solid ? "light" : theme === "dark" ? "light" : "dark";

	const backgroundStyle = useAnimatedStyle(() => ({
		opacity: interpolate(scrollY.get(), [fadeStart, solidAt], [0, 1], Extrapolation.CLAMP),
	}));
	const titleStyle = useAnimatedStyle(() => {
		const at = titleAt.get();
		const visible =
			at > 0 ? interpolate(scrollY.get(), [at - TITLE_LEAD, at + TITLE_TRAIL], [0, 1], Extrapolation.CLAMP) : 0;
		return { opacity: visible, transform: [{ translateY: (1 - visible) * 10 }] };
	});

	return (
		<View className="absolute inset-x-0 top-0" style={{ paddingTop: top }} pointerEvents="box-none">
			<StatusBar style={statusBarStyle} animated />
			<Animated.View
				pointerEvents="none"
				className="absolute inset-x-0 top-0"
				style={[{ height: top + TOP_BAR_HEIGHT + BLUR_TAIL }, backgroundStyle]}
			>
				<ProgressiveBlur />
			</Animated.View>

			<View className="flex-row items-center gap-3 px-4" style={{ height: TOP_BAR_HEIGHT }} pointerEvents="box-none">
				<GlassIconButton
					icon={ArrowLeftIcon}
					accessibilityLabel="Kembali"
					onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
				/>
				<Animated.View className="flex-1" style={titleStyle} pointerEvents="none">
					<Typography type="body-sm" weight="semibold" numberOfLines={1} align="center">
						{title}
					</Typography>
				</Animated.View>
				<View className="flex-row gap-2">{actions}</View>
			</View>
		</View>
	);
}
