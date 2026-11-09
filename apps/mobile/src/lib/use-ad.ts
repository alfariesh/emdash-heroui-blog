import type { ApiAdPlacement } from "@blog/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { adQuery } from "./queries";

/** Hide expired or unavailable banners, including after a backgrounded app resumes. */
export function useAd(placement: ApiAdPlacement) {
	const query = useQuery(adQuery(placement));
	// Another mounted screen may still hold an expired query when this slot opens.
	const [expiredAt, setExpiredAt] = useState(() => Date.now());
	const expiresAt = query.data?.expiresAt;

	useEffect(() => {
		if (expiresAt === undefined) return;
		const expire = () => {
			if (Date.now() >= expiresAt) setExpiredAt(expiresAt);
		};
		expire();
		const timer = setTimeout(expire, Math.max(0, expiresAt - Date.now()) + 1);
		const subscription = AppState.addEventListener("change", (state) => {
			if (state === "active") expire();
		});
		return () => {
			clearTimeout(timer);
			subscription.remove();
		};
	}, [expiresAt]);

	return query.data && query.data.expiresAt > expiredAt && !query.isError && !query.isPaused
		? query.data
		: null;
}
