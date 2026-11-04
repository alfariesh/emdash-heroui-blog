import type { BottomTabBarProps } from "expo-router/js-tabs";
import * as Haptics from "expo-haptics";
import { GlassView } from "heroui-native/glass-view";
import { cn } from "heroui-native/utils";
import { useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, Text, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { BookmarkIcon, CompassIcon, HomeIcon, SearchIcon, type IconSvgElement } from "@/lib/icons";

const ITEM_WIDTH = 76;
const BAR_HEIGHT = 60;
const BAR_PADDING = 4;
/** Gap between the bar and the bottom safe-area edge. */
const BAR_OFFSET = 10;
const SPRING = { damping: 22, stiffness: 260, mass: 0.9 };

/** Tab icon and label per route name in src/app/(tabs). */
export const TABS: Record<string, { label: string; icon: IconSvgElement }> = {
	index: { label: "Beranda", icon: HomeIcon },
	explore: { label: "Jelajah", icon: CompassIcon },
	search: { label: "Cari", icon: SearchIcon },
	saved: { label: "Tersimpan", icon: BookmarkIcon },
};

/**
 * Space a tab screen must leave at its bottom so the last item can scroll
 * clear of the floating tab bar.
 */
export function useTabBarInset(): number {
	const { bottom } = useSafeAreaInsets();
	return Math.max(bottom, BAR_OFFSET) + BAR_HEIGHT + 16;
}

/**
 * True while the software keyboard is up on Android, where the window resizes
 * and a bottom-anchored bar would ride on top of the keyboard. (On iOS the
 * keyboard simply covers it.)
 */
function useAndroidKeyboardVisible(): boolean {
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		if (Platform.OS !== "android") return;
		const show = Keyboard.addListener("keyboardDidShow", () => setVisible(true));
		const hide = Keyboard.addListener("keyboardDidHide", () => setVisible(false));
		return () => {
			show.remove();
			hide.remove();
		};
	}, []);
	return visible;
}

/**
 * Floating, frosted tab bar (HeroUI GlassView: blur on iOS, opaque surface on
 * Android). The active pill slides on the UI thread and respects Reduce Motion.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
	const reduceMotion = useReducedMotion();
	const keyboardVisible = useAndroidKeyboardVisible();
	const indicatorX = useSharedValue(state.index * ITEM_WIDTH);

	useEffect(() => {
		const x = state.index * ITEM_WIDTH;
		indicatorX.set(reduceMotion ? x : withSpring(x, SPRING));
	}, [state.index, reduceMotion, indicatorX]);

	const indicatorStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: indicatorX.get() }],
	}));

	if (keyboardVisible) return null;

	return (
		<View
			pointerEvents="box-none"
			className="absolute inset-x-0 bottom-0 items-center"
			style={{ paddingBottom: Math.max(insets.bottom, BAR_OFFSET) }}
		>
			<View
				className="overflow-hidden rounded-full border border-border shadow-overlay"
				style={{ height: BAR_HEIGHT, padding: BAR_PADDING }}
			>
				<GlassView intensity={60} className="rounded-full" />
				<Animated.View
					pointerEvents="none"
					className="absolute rounded-full bg-accent-soft"
					style={[
						{ top: BAR_PADDING, bottom: BAR_PADDING, start: BAR_PADDING, width: ITEM_WIDTH },
						indicatorStyle,
					]}
				/>
				<View role="tablist" className="flex-1 flex-row">
					{state.routes.map((route, index) => {
						const focused = index === state.index;
						const tab = TABS[route.name];
						const options = descriptors[route.key]?.options;
						if (!tab) return null;

						const onPress = () => {
							void Haptics.selectionAsync();
							const event = emitter.emit({
								type: "tabPress",
								target: route.key,
								canPreventDefault: true,
							});
							// Pressing the focused tab is left to listeners (scroll to top).
							if (!focused && !event.defaultPrevented) navigateToTab(route.key);
						};

						return (
							<Pressable
								key={route.key}
								role="tab"
								accessibilityState={{ selected: focused }}
								accessibilityLabel={options?.tabBarAccessibilityLabel ?? tab.label}
								onPress={onPress}
								onLongPress={() => emitter.emit({ type: "tabLongPress", target: route.key })}
								className="items-center justify-center gap-0.5"
								style={{ width: ITEM_WIDTH }}
							>
								<Icon
									icon={tab.icon}
									size={22}
									strokeWidth={focused ? 2 : 1.75}
									tone={focused ? "accent" : "muted"}
								/>
								<Text
									maxFontSizeMultiplier={1.2}
									numberOfLines={1}
									className={cn(
										"text-[11px] leading-4",
										focused ? "font-semibold text-accent" : "font-medium text-muted",
									)}
								>
									{tab.label}
								</Text>
							</Pressable>
						);
					})}
				</View>
			</View>
		</View>
	);
}
