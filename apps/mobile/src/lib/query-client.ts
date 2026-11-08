/**
 * TanStack Query setup: the single QueryClient, its offline persistence, and
 * the React Native wiring for focus (AppState) and connectivity (expo-network).
 */
import { API_BASE_PATH } from "@blog/shared";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import type { PersistQueryClientProviderProps } from "@tanstack/react-query-persist-client";
import Constants from "expo-constants";
import * as Network from "expo-network";
import { AppState, Platform } from "react-native";
import { isRetryable } from "./errors";
import { storage } from "./storage";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// The API sends `max-age=60`; refetching sooner only re-reads the edge cache.
			staleTime: MINUTE,
			// Kept for a day so the persisted cache can serve offline reading.
			gcTime: DAY,
			retry: (failureCount, error) => failureCount < 2 && isRetryable(error),
		},
	},
});

/**
 * Persist successful queries so the last-read feed and posts open instantly
 * on the next launch and work offline. Search results are not worth keeping.
 * Bumping the app version or the API prefix drops the old cache.
 */
export const persistOptions: PersistQueryClientProviderProps["persistOptions"] = {
	persister: createAsyncStoragePersister({
		storage,
		key: "query-cache",
		throttleTime: 2000,
	}),
	maxAge: DAY,
	buster: `${API_BASE_PATH}@${Constants.expoConfig?.version ?? "0"}`,
	dehydrateOptions: {
		shouldDehydrateQuery: (query) =>
			query.state.status === "success" && query.queryKey[0] !== "search",
	},
};

// Refetch stale data when the app returns to the foreground. (On the web,
// TanStack already listens to `visibilitychange`.)
if (Platform.OS !== "web") {
	focusManager.setEventListener((setFocused) => {
		const subscription = AppState.addEventListener("change", (state) =>
			setFocused(state === "active"),
		);
		return () => subscription.remove();
	});
}

// Pause queries while offline and resume them when the connection returns.
onlineManager.setEventListener((setOnline) => {
	const subscription = Network.addNetworkStateListener((state) =>
		setOnline(state.isConnected !== false),
	);
	return () => subscription.remove();
});
