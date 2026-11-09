import "@/global.css";

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { HeroUINativeProvider, type HeroUINativeConfig } from "heroui-native/provider";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MissingConfig } from "@/components/missing-config";
import { NavigationTheme } from "@/components/navigation-theme";
import { useStackScreenOptions } from "@/components/stack-screen-options";
import { API_URL } from "@/lib/config";
import { configureNotifications, syncPushRegistration } from "@/lib/notifications";
import { persistOptions, queryClient } from "@/lib/query-client";
import { applyStoredTheme } from "@/lib/theme";
import { useNotificationNavigation } from "@/lib/use-notification-navigation";

// Before the first render: keep the splash up until fonts load, and apply
// the stored light/dark choice so nothing renders in the wrong theme.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 250 });
applyStoredTheme();
configureNotifications();

/** Defined once at module scope (HeroUI: don't recreate the config per render). */
const HEROUI_CONFIG: HeroUINativeConfig = {
	// Respect Dynamic Type / font scale, but keep layouts intact at the extremes.
	textProps: { allowFontScaling: true, maxFontSizeMultiplier: 1.6 },
	textInputProps: { allowFontScaling: true, maxFontSizeMultiplier: 1.4 },
	devInfo: { stylingPrinciples: false },
	// Bottom: toasts come from article actions, and the top holds the article bar.
	toast: { defaultProps: { placement: "bottom" } },
};

// Google Sans cut down to Latin, Greek, Cyrillic and Arabic (assets/fonts, scripts/subset-fonts.sh):
// the full faces are 2.1 MB each. The family names are what global.css and the
// italic styles refer to.
const FONTS = {
	GoogleSans_400Regular: require("../../assets/fonts/google-sans-regular.ttf"),
	GoogleSans_400Regular_Italic: require("../../assets/fonts/google-sans-italic.ttf"),
	GoogleSans_500Medium: require("../../assets/fonts/google-sans-medium.ttf"),
	GoogleSans_600SemiBold: require("../../assets/fonts/google-sans-semibold.ttf"),
	GoogleSans_700Bold: require("../../assets/fonts/google-sans-bold.ttf"),
};

export const unstable_settings = {
	// Deep links into /posts/… still get the tabs underneath for "back".
	anchor: "(tabs)",
};

export default function RootLayout() {
	const [fontsLoaded, fontError] = useFonts(FONTS);
	// A font that fails to load falls back to the system font; never block the app on it.
	const ready = fontsLoaded || fontError !== null;

	useEffect(() => {
		if (ready) void SplashScreen.hideAsync();
	}, [ready]);

	if (!ready) return null;

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<HeroUINativeProvider config={HEROUI_CONFIG}>
				<PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
					<NavigationTheme>{API_URL ? <RootStack /> : <MissingConfig />}</NavigationTheme>
				</PersistQueryClientProvider>
			</HeroUINativeProvider>
		</GestureHandlerRootView>
	);
}

function RootStack() {
	const screenOptions = useStackScreenOptions();
	useNotificationNavigation();
	useEffect(() => {
		void syncPushRegistration();
	}, []);

	return (
		<Stack screenOptions={screenOptions}>
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			<Stack.Screen name="posts/[slug]" options={{ headerShown: false }} />
			<Stack.Screen name="category/[slug]" options={{ title: "" }} />
			<Stack.Screen name="tag/[slug]" options={{ title: "" }} />
			<Stack.Screen name="pages/[slug]" options={{ title: "" }} />
			<Stack.Screen name="settings" options={{ title: "Settings" }} />
		</Stack>
	);
}
