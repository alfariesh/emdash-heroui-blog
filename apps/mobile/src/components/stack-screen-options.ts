import type { NativeStackNavigationOptions } from "expo-router";
import { useThemeColor } from "heroui-native/hooks";

/**
 * Native stack header styled with HeroUI tokens: flat, on the page
 * background, Inter semibold title, platform back button and gestures.
 */
export function useStackScreenOptions(): NativeStackNavigationOptions {
	const [background, foreground] = useThemeColor(["background", "foreground"]);
	return {
		headerShadowVisible: false,
		headerStyle: { backgroundColor: background },
		headerTintColor: foreground,
		headerTitleStyle: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: foreground },
		headerBackButtonDisplayMode: "minimal",
		contentStyle: { backgroundColor: background },
		animation: "default",
	};
}
