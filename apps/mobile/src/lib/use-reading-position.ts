import { useEffect, useRef, useState } from "react";
import { AppState, type LayoutChangeEvent } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import type { ReadingPosition } from "./reading-positions";
import { getReadingPosition, saveReadingPosition } from "./reading-progress";

/** After this long the reader has clearly chosen to start over. */
const OFFER_MS = 10_000;

interface ReadingPositionOptions {
	slug: string;
	/** The full body has rendered (not the placeholder), so offsets are real. */
	ready: boolean;
	/** False when the screen opens somewhere specific (a #komentar link). */
	offer: boolean;
	scrollY: SharedValue<number>;
	viewportHeight: SharedValue<number>;
}

interface ReadingPositionState {
	/** Where the last visit ended, while it is worth offering; null otherwise. */
	resume: ReadingPosition | null;
	dismiss: () => void;
	/** For the article body's container: its bottom edge counts as "finished". */
	onBodyLayout: (event: LayoutChangeEvent) => void;
}

/**
 * "Lanjutkan membaca" for one article screen. Saves the position when the
 * screen closes or the app leaves the foreground (scrolling itself never
 * reaches JS), and exposes the previous visit's position for a resume offer.
 */
export function useReadingPosition({
	slug,
	ready,
	offer,
	scrollY,
	viewportHeight,
}: ReadingPositionOptions): ReadingPositionState {
	// Read once on open: the offer is about the previous visit, not this one.
	const [saved] = useState(() => getReadingPosition(slug));
	const [dismissed, setDismissed] = useState(false);
	const bodyEnd = useRef(0);

	useEffect(() => {
		if (!ready) return;
		const save = () => {
			if (bodyEnd.current <= 0) return;
			const offset = scrollY.get();
			// Progress through the body only: comments and "Baca Juga" below count as finished.
			saveReadingPosition(slug, offset, offset / Math.max(1, bodyEnd.current - viewportHeight.get()));
		};
		const subscription = AppState.addEventListener("change", (state) => {
			if (state !== "active") save();
		});
		return () => {
			subscription.remove();
			save();
		};
	}, [ready, slug, scrollY, viewportHeight]);

	const visible = ready && offer && !dismissed && saved !== undefined;
	useEffect(() => {
		if (!visible) return;
		const timer = setTimeout(() => setDismissed(true), OFFER_MS);
		return () => clearTimeout(timer);
	}, [visible]);

	return {
		resume: visible && saved ? saved : null,
		dismiss: () => setDismissed(true),
		onBodyLayout: (event) => {
			bodyEnd.current = event.nativeEvent.layout.y + event.nativeEvent.layout.height;
		},
	};
}
