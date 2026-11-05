import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useOpenLink } from "./use-open-link";

/**
 * Opens what a tapped notification points at (`data.url`, see
 * NewPostNotificationData), whether the tap launched the app or arrived while
 * it was running. The URL takes the same route as any blog link, so a post
 * opens its screen and anything the app cannot show opens in the browser.
 * Use once, inside the root navigator.
 */
export function useNotificationNavigation(): void {
	const openLink = useOpenLink();

	useEffect(() => {
		if (Platform.OS === "web") return;
		const open = (response: Notifications.NotificationResponse | null) => {
			const url: unknown = response?.notification.request.content.data?.url;
			if (typeof url !== "string") return;
			// Handled: a remount must not open the same post again.
			Notifications.clearLastNotificationResponse();
			openLink(url);
		};
		open(Notifications.getLastNotificationResponse());
		const subscription = Notifications.addNotificationResponseReceivedListener(open);
		return () => subscription.remove();
		// The router behind openLink is stable: listen once per mount.
	}, []);
}
