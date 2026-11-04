import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useThemeColor } from "heroui-native/hooks";
import type { ReactNode } from "react";
import { useUniwind } from "uniwind";

/**
 * Feeds HeroUI tokens to React Navigation, so native headers, screen
 * backgrounds during transitions and the status bar follow the active theme
 * (including a manual light/dark choice that differs from the system).
 */
export function NavigationTheme({ children }: { children: ReactNode }) {
	const { theme } = useUniwind();
	const isDark = theme === "dark";
	const [background, foreground, separator, accent] = useThemeColor([
		"background",
		"foreground",
		"separator",
		"accent",
	]);

	const base = isDark ? DarkTheme : DefaultTheme;
	const navigationTheme: Theme = {
		...base,
		dark: isDark,
		colors: {
			...base.colors,
			primary: accent,
			background,
			card: background,
			text: foreground,
			border: separator,
			notification: accent,
		},
	};

	return (
		<ThemeProvider value={navigationTheme}>
			<StatusBar style={isDark ? "light" : "dark"} />
			{children}
		</ThemeProvider>
	);
}
