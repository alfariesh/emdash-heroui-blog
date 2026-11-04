import "@/global.css";

// One subpath per face: the package root requires all 18 Inter files (~6 MB).
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_400Regular_Italic } from "@expo-google-fonts/inter/400Regular_Italic";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
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
import { persistOptions, queryClient } from "@/lib/query-client";
import { applyStoredTheme } from "@/lib/theme";

// Before the first render: keep the splash up until fonts load, and apply
// the stored light/dark choice so nothing renders in the wrong theme.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 250 });
applyStoredTheme();

/** Defined once at module scope (HeroUI: don't recreate the config per render). */
const HEROUI_CONFIG: HeroUINativeConfig = {
	// Respect Dynamic Type / font scale, but keep layouts intact at the extremes.
	textProps: { allowFontScaling: true, maxFontSizeMultiplier: 1.6 },
	textInputProps: { allowFontScaling: true, maxFontSizeMultiplier: 1.4 },
	devInfo: { stylingPrinciples: false },
	// Bottom: toasts come from article actions, and the top holds the article bar.
	toast: { defaultProps: { placement: "bottom" } },
};

export const unstable_settings = {
	// Deep links into /posts/… still get the tabs underneath for "back".
	anchor: "(tabs)",
};

export default function RootLayout() {
	const [fontsLoaded, fontError] = useFonts({
		Inter_400Regular,
		Inter_400Regular_Italic,
		Inter_500Medium,
		Inter_600SemiBold,
		Inter_700Bold,
	});
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
	return (
		<Stack screenOptions={screenOptions}>
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			<Stack.Screen name="posts/[slug]" options={{ headerShown: false }} />
			<Stack.Screen name="category/[slug]" options={{ title: "" }} />
			<Stack.Screen name="tag/[slug]" options={{ title: "" }} />
			<Stack.Screen name="pages/[slug]" options={{ title: "" }} />
			<Stack.Screen name="settings" options={{ title: "Pengaturan" }} />
		</Stack>
	);
}
